import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';
import api from '../api/api';
import './Checkout.css'; // Import the new CSS file

const Checkout = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const API_URL = import.meta.env.VITE_API_URL;
    const { booking } = location.state || {};

    const [promoCode, setPromoCode] = useState('');
    const [pricing, setPricing] = useState({ subtotal: 0, discount: 0, finalTotal: 0, applied: null });
    const [isProcessing, setIsProcessing] = useState(false);
    const [error, setError] = useState('');
    const [isPromoVisible, setIsPromoVisible] = useState(false); // State for promo input visibility

    useEffect(() => {
        if (!booking) {
            navigate('/');
            return;
        }
        const subtotal = booking.subtotalAmount ?? booking.totalAmount ?? 0;
        setPricing({ subtotal, discount: booking.discountAmount || 0, finalTotal: booking.totalAmount || subtotal, applied: booking.appliedOffer || null });
        
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
            setError(e.response?.data?.message || 'Invalid or expired promo code.');
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
                            await axios.post(`${API_URL}/payments/verify-payment`, {
                                order_id: response.razorpay_order_id,
                                payment_id: response.razorpay_payment_id,
                                signature: response.razorpay_signature,
                                bookingId: booking._id
                            });
                            navigate('/bookings');
                        } catch (error) {
                            setError('Payment verification failed. Please contact support.');
                        }
                    },
                    prefill: {
                        // You can prefill user details here if available
                    },
                    theme: { color: '#75d402' } // Updated theme color
                };
                const razorpay = new window.Razorpay(options);
                razorpay.open();
                setIsProcessing(false);
            };
            script.onerror = () => {
                setError('Failed to load payment gateway. Please check your connection.');
                setIsProcessing(false);
            };
        } catch (e) {
            setError(e.response?.data?.message || 'An error occurred while preparing your payment.');
            setIsProcessing(false);
        }
    };

    const formatShowtime = (dateString) => {
        const options = { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric', hour: 'numeric', minute: 'numeric', hour12: true };
        return new Date(dateString).toLocaleString('en-US', options);
    };

    if (!booking) return null;

    return (
        <div className="checkout-page">
            <h2>Checkout Summary</h2>
            {error && <div className="error-message">{error}</div>}
            
            <div className="summary">
                {booking?.movieTitle && <div className="summary-item"><span className="icon">🎬</span><span>Movie</span><span>{booking.movieTitle}</span></div>}
                {booking?.theaterName && <div className="summary-item"><span className="icon">🎭</span><span>Theater</span><span>{booking.theaterName}</span></div>}
                {booking?.screenNumber && <div className="summary-item"><span className="icon">💻</span><span>Screen</span><span>{booking.screenNumber}</span></div>}
                {booking?.seatLabels && <div className="summary-item"><span className="icon">💺</span><span>Seats</span><span>{booking.seatLabels}</span></div>}
                {booking?.showtimeTime && <div className="summary-item"><span className="icon">⏰</span><span>Showtime</span><span>{formatShowtime(booking.showtimeTime)}</span></div>}
                
                <div className="summary-item">
                    <span>Subtotal</span>
                    <span>₹{pricing.subtotal.toFixed(2)}</span>
                </div>
                
                {pricing.discount > 0 && (
                    <div className="summary-item discount">
                        <span>Discount {pricing.applied?.title ? `(${pricing.applied.title})` : ''}</span>
                        <span>-₹{pricing.discount.toFixed(2)}</span>
                    </div>
                )}

                <div className="summary-total">
                    <span>Total Payable</span>
                    <span>₹{pricing.finalTotal.toFixed(2)}</span>
                </div>
            </div>

            {!isPromoVisible ? (
                <button className="promo-toggle" onClick={() => setIsPromoVisible(true)}>
                    Enter Promo Code
                </button>
            ) : (
                <div className="promo">
                    <input 
                        placeholder="Enter Promo Code" 
                        value={promoCode} 
                        onChange={(e) => setPromoCode(e.target.value)} 
                    />
                    <button onClick={applyOffer}>Apply</button>
                </div>
            )}

            <div className="actions">
                <button onClick={proceedToPayment} disabled={isProcessing}>
                    {isProcessing ? 'Processing...' : `Pay ₹${pricing.finalTotal.toFixed(2)}`}
                </button>
            </div>
        </div>
    );
};

export default Checkout;


