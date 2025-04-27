import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './BookingConfirmationModal.css';

const BookingConfirmationModal = ({ isOpen, onClose, bookingDetails, onConfirmBooking }) => {
    const [isProcessing, setIsProcessing] = useState(false);
    const API_URL = import.meta.env.VITE_API_URL;

    useEffect(() => {
        if (isOpen && bookingDetails) {
            console.log('Booking Details:', bookingDetails);
        }
    }, [isOpen, bookingDetails]);

    if (!isOpen) return null;

    const formatTime = (dateTimeString) => {
        const date = new Date(dateTimeString);
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    const formatDate = (dateTimeString) => {
        const date = new Date(dateTimeString);
        return date.toLocaleDateString('en-US', {
            weekday: 'short',
            day: 'numeric',
            month: 'short',
            year: 'numeric'
        });
    };

    const handlePayment = async () => {
        try {
            setIsProcessing(true);

            if (!bookingDetails || !bookingDetails._id) {
                console.error('Invalid booking details:', bookingDetails);
                alert('Invalid booking details. Please try again.');
                setIsProcessing(false);
                return;
            }

            console.log('Creating order with details:', {
                amount: bookingDetails.totalAmount,
                bookingId: bookingDetails._id
            });

            // Create order on backend
            const orderResponse = await axios.post(`${API_URL}/payments/create-order`, {
                amount: bookingDetails.totalAmount,
                bookingId: bookingDetails._id
            });

            console.log('Order response:', orderResponse.data);
            const { order } = orderResponse.data;

            // Load Razorpay script
            const script = document.createElement('script');
            script.src = 'https://checkout.razorpay.com/v1/checkout.js';
            script.async = true;
            document.body.appendChild(script);

            script.onload = () => {
                // Initialize Razorpay
                const options = {
                    key: import.meta.env.VITE_RAZORPAY_KEY_ID,
                    amount: order.amount,
                    currency: order.currency,
                    name: 'CinePlus',
                    description: 'Movie Ticket Booking',
                    order_id: order.id,
                    handler: async function (response) {
                        try {
                            console.log('Payment success response:', response);
                            // Verify payment on backend
                            const verificationResponse = await axios.post(`${API_URL}/payments/verify-payment`, {
                                order_id: response.razorpay_order_id,
                                payment_id: response.razorpay_payment_id,
                                signature: response.razorpay_signature,
                                bookingId: bookingDetails._id
                            });

                            console.log('Verification response:', verificationResponse.data);

                            // Payment successful, confirm booking
                            onConfirmBooking();
                            onClose();
                        } catch (error) {
                            console.error('Payment verification failed:', error.response?.data || error);
                            alert('Payment verification failed. Please try again.');
                        }
                    },
                    prefill: {
                        name: bookingDetails.userName || '',
                        email: bookingDetails.userEmail || '',
                    },
                    theme: {
                        color: '#3399cc'
                    }
                };

                console.log('Initializing Razorpay with options:', options);
                const razorpay = new window.Razorpay(options);
                razorpay.open();
            };

            script.onerror = () => {
                console.error('Failed to load Razorpay SDK');
                alert('Failed to load Razorpay SDK. Please try again.');
                setIsProcessing(false);
            };

        } catch (error) {
            console.error('Payment initialization failed:', error.response?.data || error);
            alert('Payment initialization failed. Please try again.');
            setIsProcessing(false);
        }
    };

    return (
        <div className="booking-confirmation-modal-overlay">
            <div className="booking-confirmation-modal">
                <div className="modal-header">
                    <h2>Confirm Booking</h2>
                    <button className="close-button" onClick={onClose}>
                        <svg viewBox="0 0 24 24" width="24" height="24">
                            <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
                        </svg>
                    </button>
                </div>

                <div className="modal-body">
                    <div className="ticket-design">
                        <div className="ticket-header">
                            <div className="branding">
                                <span className="brand-logo">CinePlus+</span>
                                <span className="brand-tagline">Premium Movie Experience</span>
                            </div>
                            <div className="ticket-graphic">
                                <div className="perforation"></div>
                            </div>
                        </div>

                        <div className="ticket-content">
                            {bookingDetails && (
                                <>
                                    <div className="movie-title">{bookingDetails.movieTitle}</div>

                                    <div className="info-section">
                                        <div className="info-row">
                                            <svg viewBox="0 0 24 24" width="20" height="20">
                                                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z" />
                                            </svg>
                                            <span>{formatTime(bookingDetails.showtimeTime)}</span>
                                        </div>
                                        <div className="info-row">
                                            <svg viewBox="0 0 24 24" width="20" height="20">
                                                <path d="M19 4h-1V2h-2v2H8V2H6v2H5c-1.11 0-1.99.9-1.99 2L3 20c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V10h14v10zM9 14H7v-2h2v2zm4 0h-2v-2h2v2zm4 0h-2v-2h2v2z" />
                                            </svg>
                                            <span>{formatDate(bookingDetails.showtimeTime)}</span>
                                        </div>
                                        {/* <div className="info-row">
                                            <svg viewBox="0 0 24 24" width="20" height="20">
                                                <path d="M4 15h6c.55 0 1-.45 1-1s-.45-1-1-1H4c-.55 0-1 .45-1 1s.45 1 1 1zm0 4h6c.55 0 1-.45 1-1s-.45-1-1-1H4c-.55 0-1 .45-1 1s.45 1 1 1zm0-8h6c.55 0 1-.45 1-1s-.45-1-1-1H4c-.55 0-1 .45-1 1s.45 1 1 1zM3 6c0 .55.45 1 1 1h6c.55 0 1-.45 1-1s-.45-1-1-1H4c-.55 0-1 .45-1 1zm11-1h6c.55 0 1 .45 1 1v12c0 .55-.45 1-1 1h-6c-.55 0-1-.45-1-1V6c0-.55.45-1 1-1z" />
                                            </svg>
                                            <span>{bookingDetails.theaterName}</span>
                                        </div> */}
                                        <div className="info-row">
                                            <svg viewBox="0 0 24 24" width="20" height="20">
                                                <path d="M18 11c0-.959-.68-1.761-1.581-1.954C16.779 8.445 17 7.75 17 7c0-2.206-1.794-4-4-4-1.516 0-2.821.857-3.5 2.104C8.821 3.857 7.516 3 6 3 3.794 3 2 4.794 2 7c0 .902.312 1.727.817 2.396A1.994 1.994 0 0 0 2 11v8c0 1.103.897 2 2 2h12c1.103 0 2-.897 2-2v-2.637l4 2v-7l-4 2V11zm-5-6c1.103 0 2 .897 2 2s-.897 2-2 2-2-.897-2-2 .897-2 2-2zM6 5c1.103 0 2 .897 2 2s-.897 2-2 2-2-.897-2-2 .897-2 2-2z" />
                                            </svg>
                                            <span>Screen {bookingDetails.screenNumber}, {bookingDetails.theaterName}</span>
                                        </div>
                                    </div>

                                    <div className="seats-section">
                                        <div className="seats-info">
                                            <span className="seats-label">Selected Seats:</span>
                                            <span className="seats-list">{bookingDetails.seatLabels}</span>
                                        </div>
                                        <div className="total-amount">
                                            <span>Total:</span>
                                            <span className="amount">₹{bookingDetails.totalAmount?.toFixed(2)}</span>
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </div>

                <div className="modal-actions">
                    <button 
                        className="confirm-button" 
                        onClick={handlePayment}
                        disabled={isProcessing || !bookingDetails?._id}
                    >
                        {isProcessing ? 'Processing...' : 'Proceed to Payment'}
                    </button>
                    <button className="cancel-button" onClick={onClose}>
                        Cancel
                    </button>
                </div>
            </div>
        </div>
    );
};

export default BookingConfirmationModal;