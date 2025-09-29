import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';
import api, { evaluateOfferApi } from '../api/api';

const Checkout = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const API_URL = import.meta.env.VITE_API_URL;
    const { booking } = location.state || {};

    const [promoCode, setPromoCode] = useState('');
    const [pricing, setPricing] = useState({ subtotal: 0, discount: 0, finalTotal: 0, applied: null });
    const [isProcessing, setIsProcessing] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (!booking) {
            navigate('/');
            return;
        }
        const subtotal = booking.subtotalAmount ?? booking.totalAmount ?? 0;
        setPricing({ subtotal, discount: booking.discountAmount || 0, finalTotal: booking.totalAmount || subtotal, applied: booking.appliedOffer || null });
        // Auto-apply best conditional offer (no promo) for this booking
        (async () => {
            try {
                const res = await api.post('/offers/apply-to-booking', { bookingId: booking._id });
                const data = res.data?.data;
                if (data) {
                    setPricing({
                        subtotal: data.subtotalAmount,
                        discount: data.discountAmount,
                        finalTotal: data.totalAmount,
                        applied: data.appliedOffer,
                    });
                }
            } catch (e) {
                // Non-fatal: fallback to subtotal with no discount
                console.warn('[Checkout] Auto-apply conditional offer failed:', e.response?.data || e.message);
            }
        })();
    }, [booking, navigate]);

    const applyOffer = async () => {
        try {
            setError('');
            const res = await api.post('/offers/apply-to-booking', { bookingId: booking._id, promoCode: promoCode?.trim() || undefined });
            const data = res.data?.data;
            setPricing({
                subtotal: data.subtotalAmount,
                discount: data.discountAmount,
                finalTotal: data.totalAmount,
                applied: data.appliedOffer,
            });
        } catch (e) {
            setError(e.response?.data?.message || e.message);
        }
    };

    const proceedToPayment = async () => {
        try {
            setIsProcessing(true);
            setError('');
            const orderResponse = await axios.post(`${API_URL}/payments/create-order`, {
                amount: pricing.finalTotal,
                bookingId: booking._id
            });
            const { order } = orderResponse.data;

            const script = document.createElement('script');
            script.src = 'https://checkout.razorpay.com/v1/checkout.js';
            script.async = true;
            document.body.appendChild(script);
            script.onload = () => {
                const options = {
                    key: import.meta.env.VITE_RAZORPAY_KEY_ID,
                    amount: order.amount,
                    currency: order.currency,
                    name: 'CinePlus',
                    description: 'Movie Ticket Booking',
                    order_id: order.id,
                    handler: async function (response) {
                        try {
                            const verificationResponse = await axios.post(`${API_URL}/payments/verify-payment`, {
                                order_id: response.razorpay_order_id,
                                payment_id: response.razorpay_payment_id,
                                signature: response.razorpay_signature,
                                bookingId: booking._id
                            });
                            navigate('/bookings');
                        } catch (error) {
                            alert('Payment verification failed. Please try again.');
                        }
                    },
                    theme: { color: '#3399cc' }
                };
                const razorpay = new window.Razorpay(options);
                razorpay.open();
                setIsProcessing(false);
            };
            script.onerror = () => {
                setError('Failed to load Razorpay SDK');
                setIsProcessing(false);
            };
        } catch (e) {
            setError(e.response?.data?.message || e.message);
            setIsProcessing(false);
        }
    };

    if (!booking) return null;

    return (
        <div className="checkout-page">
            <h2>Checkout</h2>
            {error && <div className="error-message">{error}</div>}
            <div className="summary">
                {booking?.movieTitle && <div>Movie: {booking.movieTitle}</div>}
                {booking?.theaterName && <div>Theater: {booking.theaterName}</div>}
                {booking?.screenNumber && <div>Screen: {booking.screenNumber}</div>}
                {booking?.seatLabels && <div>Seats: {booking.seatLabels}</div>}
                {booking?.showtimeTime && <div>Showtime: {new Date(booking.showtimeTime).toLocaleString()}</div>}
                <div>Subtotal: ₹{pricing.subtotal.toFixed(2)}</div>
                {pricing.discount > 0 && (
                    <div>Discount{pricing.applied?.title ? ` (${pricing.applied.title})` : ''}: -₹{pricing.discount.toFixed(2)}</div>
                )}
                <div>Payable: ₹{pricing.finalTotal.toFixed(2)}</div>
            </div>
            <div className="promo">
                <input placeholder="Enter promo code" value={promoCode} onChange={(e) => setPromoCode(e.target.value)} />
                <button onClick={applyOffer}>Apply</button>
            </div>
            <div className="actions">
                <button onClick={proceedToPayment} disabled={isProcessing}>Proceed to Payment</button>
            </div>
        </div>
    );
};

export default Checkout;


