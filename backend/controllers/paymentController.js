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

        const options = {
            amount: Math.round(amount * 100), // Razorpay expects amount in paise
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