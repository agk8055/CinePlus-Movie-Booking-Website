const Razorpay = require('razorpay');
const Payment = require('../models/Payment');
const Booking = require('../models/Booking');
const crypto = require('crypto');

// Initialize Razorpay
const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET
});

// Create a new order
const createOrder = async (req, res) => {
    try {
        const { amount, bookingId } = req.body;
        console.log('Creating order for:', { amount, bookingId });

        if (!amount || !bookingId) {
            return res.status(400).json({
                success: false,
                message: 'Amount and bookingId are required'
            });
        }

        // Prefer backend booking total to avoid tampering
        const booking = await Booking.findById(bookingId).lean();
        if (!booking) {
            return res.status(404).json({ success: false, message: 'Booking not found' });
        }

        const payable = Number.isFinite(booking.total_amount) ? booking.total_amount : amount;

        const options = {
            amount: Math.round(payable * 100), // Razorpay expects amount in paise
            currency: 'INR',
            receipt: `receipt_${bookingId}`,
            payment_capture: 1
        };

        console.log('Creating Razorpay order with options:', options);
        const order = await razorpay.orders.create(options);
        console.log('Razorpay order created:', order);

        res.status(200).json({
            success: true,
            order
        });
    } catch (error) {
        console.error('Error creating order:', error);
        res.status(500).json({
            success: false,
            message: 'Error creating order',
            error: error.message
        });
    }
};

// Verify payment and update booking status
const verifyPayment = async (req, res) => {
    console.log('Payment verification request received:', req.body);
    try {
        const { order_id, payment_id, signature, bookingId } = req.body;

        // Validate required fields
        if (!order_id || !payment_id || !signature || !bookingId) {
            console.error('Missing required fields:', { order_id, payment_id, signature, bookingId });
            return res.status(400).json({
                success: false,
                message: 'Missing required fields for payment verification'
            });
        }

        // Verify the payment signature
        const text = order_id + "|" + payment_id;
        const expectedSignature = crypto
            .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
            .update(text)
            .digest('hex');

        console.log('Signature verification:', {
            expected: expectedSignature,
            received: signature,
            match: expectedSignature === signature
        });

        if (expectedSignature !== signature) {
            console.error('Signature verification failed');
            return res.status(400).json({
                success: false,
                message: 'Invalid payment signature'
            });
        }

        // Find the booking
        console.log('Finding booking with ID:', bookingId);
        const booking = await Booking.findById(bookingId);
        
        if (!booking) {
            console.error('Booking not found:', bookingId);
            return res.status(404).json({
                success: false,
                message: 'Booking not found'
            });
        }

        console.log('Found booking:', booking);

        // Create payment record
        const payment = new Payment({
            booking_id: bookingId,
            booking_amount: booking.total_amount,
            payment_status: 'Success',
            payment_provider: 'Razorpay',
            transaction_id: payment_id
        });

        console.log('Creating payment record:', payment);
        await payment.save();
        console.log('Payment record created successfully');

        // Update booking status
        booking.payment_status = 'paid';
        booking.status = 'active';
        booking.payment_id = payment._id;
        
        console.log('Updating booking:', booking);
        await booking.save();
        console.log('Booking updated successfully');

        // Send confirmation email after successful payment
        try {
            const User = require('../models/User');
            const Showtime = require('../models/Showtime');
            const Screen = require('../models/Screen');
            const Theater = require('../models/Theater');
            const sendEmail = require('../utils/emailService');

            const populatedBooking = await Booking.findById(bookingId)
                .populate({
                    path: 'showtime_id',
                    select: 'start_time screen_id movie_id',
                    populate: [
                        { path: 'movie_id', select: 'title' },
                        { path: 'screen_id', select: 'screen_number theater_id', populate: { path: 'theater_id', select: 'name city' } }
                    ]
                })
                .lean();

            const user = await User.findById(populatedBooking.user_id).select('name email').lean();
            if (user && user.email) {
                const movie = populatedBooking.showtime_id?.movie_id;
                const screen = populatedBooking.showtime_id?.screen_id;
                const theater = screen?.theater_id;
                const seatNumbersString = (populatedBooking.booked_seats || []).map(s => s.seat_number).join(', ');

                const emailHtml = `
                    <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
                        <h1 style="color: #4a4a4a;">Cineplus Booking Confirmation</h1>
                        <p>Hi ${user.name || 'Valued Customer'},</p>
                        <p>Thank you! Your payment was successful. Here are your booking details:</p>
                        <div style="border: 1px solid #eee; padding: 15px; margin-top: 10px; background-color: #f9f9f9;">
                            <h2 style="margin-top: 0; color: #555;">Booking Summary</h2>
                            <p><strong>Booking ID:</strong> ${populatedBooking._id}</p>
                            <p><strong>Movie:</strong> ${movie?.title || 'N/A'}</p>
                            <p><strong>Theater:</strong> ${theater?.name || 'N/A'} ${theater?.city ? `(${theater.city})` : ''}</p>
                            <p><strong>Screen:</strong> ${screen?.screen_number || 'N/A'}</p>
                            <p><strong>Date & Time:</strong> ${new Date(populatedBooking.showtime_id?.start_time).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short', hour12: true })}</p>
                            <p><strong>Seats:</strong> ${seatNumbersString}</p>
                            <p><strong>Total Paid:</strong> ₹${(populatedBooking.total_amount || 0).toFixed(2)}</p>
                        </div>
                        <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
                        <p>Please show this email or your booking details in the Cineplus app at the theater entrance.</p>
                        <p>Enjoy your movie!</p>
                        <p>— The Cineplus Team</p>
                    </div>
                `;

                await sendEmail({
                    email: user.email,
                    subject: `✅ Payment Successful — Your Cineplus Tickets for ${movie?.title || 'the show'}`,
                    html: emailHtml,
                    message: `Your payment was successful. Booking ID: ${populatedBooking._id}`
                });
            }
        } catch (emailErr) {
            console.error('Failed to send confirmation email after payment:', emailErr);
        }

        res.status(200).json({
            success: true,
            message: 'Payment verified successfully',
            booking: booking
        });
    } catch (error) {
        console.error('Error in payment verification:', error);
        res.status(500).json({
            success: false,
            message: 'Error verifying payment',
            error: error.message,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
};

module.exports = {
    createOrder,
    verifyPayment
}; 