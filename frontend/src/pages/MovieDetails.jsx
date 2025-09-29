import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getMovieById, getMovieBookingStats, getReviewsByMovie, addOrUpdateMyReview, getMyReview, deleteMyReview } from "../api/api";
import { useContext } from "react";
import { UserContext } from "../context/UserContext";
import { FastAverageColor } from 'fast-average-color';
import "./MovieDetails.css";

const MovieDetails = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [movie, setMovie] = useState(null);
    const [showtimes, setShowtimes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    
    // State for booking stats and timeframe toggle
    const [bookingCount, setBookingCount] = useState(null);
    const [isStatsLoading, setIsStatsLoading] = useState(true);
    const [timeframe, setTimeframe] = useState('24h'); // '24h' or '1h'
    
    const [backdropStyle, setBackdropStyle] = useState({});

    // Reviews state
    const [reviews, setReviews] = useState([]);
    const [reviewsPage, setReviewsPage] = useState(1);
    const [reviewsHasMore, setReviewsHasMore] = useState(false);
    const [isReviewsLoading, setIsReviewsLoading] = useState(false);
    const [myRating, setMyRating] = useState(0);
    const [myComment, setMyComment] = useState("");
    const [myReviewId, setMyReviewId] = useState(null);
    const { isAuthenticated, user } = useContext(UserContext);
    const [menuOpenReviewId, setMenuOpenReviewId] = useState(null);
    const [isEditingMyReview, setIsEditingMyReview] = useState(false);
    const [myEligible, setMyEligible] = useState(false);
    const [myHasBooking, setMyHasBooking] = useState(false);
    const [notice, setNotice] = useState("");

    // Effect for fetching main movie details (runs only when 'id' changes)
    useEffect(() => {
        const fetchMovieDetails = async () => {
            setLoading(true);
            setError(null);
            try {
                const detailsResponse = await getMovieById(id);
                const movieData = detailsResponse.movie;
                
                setMovie(movieData);
                setShowtimes(detailsResponse.showtimes);

                if (movieData && movieData.poster_url) {
                    const fac = new FastAverageColor();
                    fac.getColorAsync(movieData.poster_url)
                        .then(color => {
                            setBackdropStyle({
                                background: `radial-gradient(ellipse at center, ${color.hex} 0%, #0a0a0a 100%)`
                            });
                        })
                        .catch(e => {
                            console.error("Could not get poster color:", e);
                            setBackdropStyle({
                                background: `radial-gradient(ellipse at center, #222 0%, #0a0a0a 100%)`
                            });
                        });
                }
            } catch (error) {
                console.error("Error fetching movie details:", error);
                setError(error);
            } finally {
                setLoading(false);
            }
        };

        fetchMovieDetails();
    }, [id]);

    // Effect for fetching booking stats (runs when 'id' or 'timeframe' changes)
    useEffect(() => {
        const fetchStats = async () => {
            if (!id) return;
            setIsStatsLoading(true);
            try {
                const statsResponse = await getMovieBookingStats(id, timeframe);
                setBookingCount(statsResponse.ticketCount);
            } catch (error) {
                console.error(`Error fetching stats for timeframe ${timeframe}:`, error);
                setBookingCount(0); // Default to 0 on error
            } finally {
                setIsStatsLoading(false);
            }
        };

        if (showtimes && showtimes.length > 0) {
            fetchStats();
        }
    }, [id, timeframe, showtimes]);

    // Load reviews
    useEffect(() => {
        const loadReviews = async () => {
            if (!id) return;
            setIsReviewsLoading(true);
            try {
                const res = await getReviewsByMovie(id, { page: reviewsPage, limit: 5 });
                if (reviewsPage === 1) {
                    setReviews(res.items || []);
                } else {
                    setReviews(prev => [...prev, ...(res.items || [])]);
                }
                setReviewsHasMore(res.hasMore);
            } catch (e) {
                console.error('Failed to load reviews', e);
            } finally {
                setIsReviewsLoading(false);
            }
        };
        loadReviews();
    }, [id, reviewsPage]);

    // Load my review to prefill
    useEffect(() => {
        const loadMyReview = async () => {
            if (!id || !isAuthenticated) return;
            try {
                const res = await getMyReview(id);
                setMyEligible(!!res?.eligible);
                setMyHasBooking(!!res?.hasBooking);
                if (res && res.review) {
                    setMyReviewId(res.review._id);
                    setMyRating(res.review.rating || 0);
                    setMyComment(res.review.comment || "");
                    setIsEditingMyReview(false);
                } else {
                    setMyReviewId(null);
                    setMyRating(0);
                    setMyComment("");
                    setIsEditingMyReview(false);
                }
            } catch (_) {
                // ignore
            }
        };
        loadMyReview();
    }, [id, isAuthenticated]);

    const handleDeleteMyReview = async () => {
        if (!isAuthenticated) return;
        if (!confirm('Delete your review?')) return;
        try {
            await deleteMyReview(id);
            const detailsResponse = await getMovieById(id);
            setMovie(detailsResponse.movie);
            setReviewsPage(1);
            setMyReviewId(null);
            setMyRating(0);
            setMyComment("");
            setIsEditingMyReview(false);
        } catch (e) {
            console.error('Failed to delete review', e);
            alert(e?.response?.data?.message || 'Failed to delete review');
        }
    };

    const handleSubmitReview = async (e) => {
        e.preventDefault();
        if (!isAuthenticated) {
            alert('Please login to submit a review.');
            return;
        }
        if (myRating < 0.5 || myRating > 5) {
            alert('Please select a rating between 0.5 and 5.');
            return;
        }
        try {
            const isUpdate = !!myReviewId;
            await addOrUpdateMyReview(id, { rating: myRating, comment: myComment });
            // Refresh movie to update avgRatingPoints and reviewCount
            const detailsResponse = await getMovieById(id);
            setMovie(detailsResponse.movie);
            // Reload reviews from first page
            setReviewsPage(1);
            // Show success notice
            setNotice(isUpdate ? 'Review updated successfully.' : 'Review submitted successfully.');
            setTimeout(() => setNotice(""), 3000);
            // Exit edit mode on save
            if (isUpdate) setIsEditingMyReview(false);
        } catch (e) {
            console.error('Failed to submit review', e);
            alert(e?.response?.data?.message || 'Failed to submit review');
        }
    };

    // Star rating components
    const Star = ({ fill = 0 }) => {
        const clamped = Math.max(0, Math.min(1, fill));
        return (
            <div style={{ position: 'relative', width: 24, height: 24, display: 'inline-block' }}>
                <svg viewBox="0 0 24 24" width="24" height="24" style={{ position: 'absolute', top: 0, left: 0 }}>
                    <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" fill="#444" />
                </svg>
                <div style={{ position: 'absolute', top: 0, left: 0, width: `${clamped * 100}%`, height: '100%', overflow: 'hidden' }}>
                    <svg viewBox="0 0 24 24" width="24" height="24">
                        <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" fill="#75d402" />
                    </svg>
                </div>
            </div>
        );
    };

    const StarRating = ({ value, onChange, readOnly = false }) => {
        const stars = [0,1,2,3,4];
        const handleClick = (index, e) => {
            if (readOnly) return;
            const rect = e.currentTarget.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const half = x < rect.width / 2 ? 0.5 : 1;
            const newValue = index + half;
            onChange(newValue);
        };
        return (
            <div className={`star-rating ${readOnly ? 'read-only' : ''}`} style={{ display: 'inline-flex', gap: 4 }}>
                {stars.map((i) => {
                    const fill = Math.max(0, Math.min(1, value - i));
                    return (
                        <div key={i} onClick={(e) => handleClick(i, e)} style={{ cursor: readOnly ? 'default' : 'pointer' }}>
                            <Star fill={fill} />
                        </div>
                    );
                })}
            </div>
        );
    };


    if (loading) {
        return <div className="loading">Loading...</div>;
    }

    if (error) {
        return <div className="error">Error: {error.message}</div>;
    }

    if (!movie) {
        return <div className="not-found">Movie not found.</div>;
    }

    const handleBookNow = () => {
        navigate(`/showtimes/${id}`);
    };

    const handleTrailerClick = () => {
        if (movie.trailer_url) {
            window.open(movie.trailer_url, '_blank');
        } else {
            alert('Trailer link not available for this movie.');
        }
    };
    
    const otherReviews = reviews.filter(r => r._id !== myReviewId);

    return (
        <div className="movie-details-wrapper">
            <div className="movie-backdrop" style={backdropStyle}>
                <div className="backdrop-overlay"></div>
            </div>

            <div className="movie-details-content">
                <div className="movie-details-container">
                    <div className="movie-details-poster">
                        <img src={movie.poster_url} alt={movie.title} />
                    </div>

                    <div className="movie-details-info">
                        <h1 className="movie-details-title">{movie.title}</h1>

                        <div className="movie-details-format">
                            <span className="format-pill">{Array.isArray(movie.languages) ? movie.languages.join(', ') : movie.languages}</span>
                            <span className="format-pill">{movie.duration}m</span>
                            {movie.rating && <span className="format-pill age-rating">{movie.rating}+</span>}
                        </div>

                        <div className="movie-details-misc">
                            <span>{new Date(movie.release_date).toLocaleDateString("en-GB", {
                                day: "numeric", month: "short", year: "numeric",
                            })}</span>
                            <span className="dot-separator">•</span>
                            <span>{movie.genre}</span>
                            {typeof movie.avgRatingPoints === 'number' && new Date(movie.release_date) <= new Date() && (
                                <>
                                    <span className="dot-separator">•</span>
                                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                        <svg width="20" height="20" viewBox="0 0 24 24" fill="#75d402">
                                            <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
                                        </svg>
                                        {movie.avgRatingPoints.toFixed(1)} / 5 ({movie.reviewCount || 0} reviews)
                                    </span>
                                </>
                            )}
                        </div>
                        
                        {/* UPDATED: Booking stats with toggle */}
                        {showtimes.length > 0 && (
                            <div className="booking-stats">
                                <div className="timeframe-toggle">
                                    <button 
                                        className={`toggle-btn ${timeframe === '24h' ? 'active' : ''}`}
                                        onClick={() => setTimeframe('24h')}>
                                        Last 24h
                                    </button>
                                    <button 
                                        className={`toggle-btn ${timeframe === '1h' ? 'active' : ''}`}
                                        onClick={() => setTimeframe('1h')}>
                                        Last 1h
                                    </button>
                                </div>
                                <div className="stats-display">
                                    {isStatsLoading ? (
                                        <span className="stats-loader"></span>
                                    ) : (
                                        <p>
                                            <strong>{bookingCount}</strong> tickets booked in the last {timeframe === '24h' ? '24 hours' : 'hour'}!
                                        </p>
                                    )}
                                </div>
                            </div>
                        )}

                        <div className="movie-details-about">
                            <h3>About the movie</h3>
                            <p>{movie.description}</p>
                        </div>

                        <div className="action-buttons">
                            {showtimes.length > 0 ? (
                                <button className="book-tickets-button" onClick={handleBookNow}>
                                    <svg className="ticket-icon" viewBox="0 0 24 24">
                                        <path d="M15.58 16.8L12 14.5l-3.58 2.3 1.08-4.12L6.21 10l4.25-.26L12 5.8l1.54 3.94 4.25.26-3.29 2.68 1.08 4.12zM20 12c0-1.1.9-2 2-2V6c0-1.1-.9-2-2-2H4c-1.1 0-2 .9-2 2v4c1.1 0 2 .9 2 2s-.9 2-2 2v4c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2v-4c-1.1 0-2-.9-2-2z" />
                                    </svg>
                                    Book Tickets
                                </button>
                            ) : (
                                <div className="no-showtimes">
                                    <p>No showtimes available currently</p>
                                </div>
                            )}

                            <button className="trailer-button" onClick={handleTrailerClick}>
                                <svg className="play-icon" viewBox="0 0 24 24">
                                    <path d="M8 5v14l11-7z" />
                                </svg>
                                Watch Trailer
                            </button>
                        </div>
                    </div>
                {/* Reviews Section */}
                <div className="reviews-section">
                    <h3>Reviews & Ratings</h3>
                    {notice && (
                        <div className="review-notice">
                            {notice}
                        </div>
                    )}
                    {isAuthenticated && (
                        <>
                            {myReviewId && !isEditingMyReview ? (
                                <div className="my-review-card">
                                    <button 
                                        type="button"
                                        aria-label="More options"
                                        onClick={() => setMenuOpenReviewId(menuOpenReviewId === 'mine' ? null : 'mine')}
                                        className="review-menu-btn"
                                    >
                                        ⋮
                                    </button>
                                    {menuOpenReviewId === 'mine' && (
                                        <div className="review-menu">
                                            {myEligible && (
                                                <button type="button" onClick={() => { setIsEditingMyReview(true); setMenuOpenReviewId(null); }}>Edit</button>
                                            )}
                                            <button type="button" onClick={() => { setMenuOpenReviewId(null); handleDeleteMyReview(); }} className="delete-btn">Delete</button>
                                        </div>
                                    )}
                                    <div className="review-header">
                                        <img src={user?.profile_picture || 'https://ui-avatars.com/api/?background=222&color=fff&name=' + encodeURIComponent(user?.name || 'U')}
                                            alt="avatar"
                                            className="review-avatar" />
                                        <div className="review-meta">
                                            <div className="review-author">Your Review</div>
                                            <div className="star-rating-display">
                                                <StarRating value={myRating} readOnly={true} />
                                                <span className="rating-value">{myRating.toFixed(1)} / 5</span>
                                            </div>
                                        </div>
                                    </div>
                                    {myComment && (
                                        <div className="review-body">
                                            <p className="review-comment">{myComment}</p>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <>
                                    {myEligible ? (
                                        <form onSubmit={handleSubmitReview} className="review-form">
                                            <div className="form-group">
                                                <label>Your Rating</label>
                                                <div className="rating-group">
                                                    <StarRating value={myRating} onChange={setMyRating} />
                                                    <div className="rating-value-display">{myRating ? myRating.toFixed(1) : '0.0'}</div>
                                                </div>
                                            </div>
                                            <div className="form-group">
                                                <label htmlFor="review-comment">Your Comment (optional)</label>
                                                <textarea id="review-comment" value={myComment} onChange={(e) => setMyComment(e.target.value)} rows={4} placeholder="Share your thoughts about the movie..."/>
                                            </div>
                                            <div className="form-actions">
                                                <button type="submit">{myReviewId ? 'Save Changes' : 'Submit Review'}</button>
                                                {myReviewId && isEditingMyReview && (
                                                    <button type="button" onClick={() => setIsEditingMyReview(false)} className="cancel-btn">Cancel</button>
                                                )}
                                            </div>
                                        </form>
                                    ) : (
                                        <div className="review-notice">{myHasBooking ? 'You can review this movie after your show has ended.' : 'First book ticket to review.'}</div>
                                    )}
                                </>
                            )}
                        </>
                    )}
                    {isReviewsLoading && otherReviews.length === 0 ? (
                        <p>Loading reviews...</p>
                    ) : (
                        <ul className="reviews-list">
                            {otherReviews.map((r) => (
                                <li key={r._id} className="review-card">
                                    <div className="review-header">
                                        <img src={r.userId?.profile_picture || 'https://ui-avatars.com/api/?background=222&color=fff&name=' + encodeURIComponent(r.userId?.name || 'U')}
                                            alt="avatar"
                                            className="review-avatar" />
                                        <div className="review-meta">
                                            <div className="review-author">{r.userId?.name || 'User'}</div>
                                            <div className="review-date">{new Date(r.createdAt).toLocaleDateString("en-GB", { day: 'numeric', month: 'long', year: 'numeric' })}</div>
                                        </div>
                                    </div>
                                    <div className="review-body">
                                        <div className="star-rating-display" style={{ marginBottom: '1rem' }}>
                                            <StarRating value={r.rating} readOnly={true} />
                                            <span className="rating-value">{r.rating.toFixed(1)} / 5</span>
                                        </div>
                                        {r.comment && <p className="review-comment">{r.comment}</p>}
                                    </div>
                                </li>
                            ))}
                        </ul>
                    )}
                    {reviewsHasMore && (
                        <button disabled={isReviewsLoading} onClick={() => setReviewsPage(p => p + 1)} className="load-more-reviews">
                            {isReviewsLoading ? 'Loading...' : 'Load More Reviews'}
                        </button>
                    )}
                </div>
                </div>
            </div>
        </div>
    );
};

export default MovieDetails;