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
                    <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" fill="#333" />
                </svg>
                <div style={{ position: 'absolute', top: 0, left: 0, width: `${clamped * 100}%`, height: '100%', overflow: 'hidden' }}>
                    <svg viewBox="0 0 24 24" width="24" height="24">
                        <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" fill="#f5c518" />
                    </svg>
                </div>
            </div>
        );
    };

    const StarRating = ({ value, onChange }) => {
        const stars = [0,1,2,3,4];
        const handleClick = (index, e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const half = x < rect.width / 2 ? 0.5 : 1;
            const newValue = index + half;
            onChange(newValue);
        };
        return (
            <div style={{ display: 'inline-flex', gap: 4 }}>
                {stars.map((i) => {
                    const fill = Math.max(0, Math.min(1, value - i));
                    return (
                        <div key={i} onClick={(e) => handleClick(i, e)} style={{ cursor: 'pointer' }}>
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
                            {typeof movie.avgRatingPoints === 'number' && (
                                <>
                                    <span className="dot-separator">•</span>
                                    <span>
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
                <div className="reviews-section" style={{ marginTop: '24px' }}>
                    <h3>Reviews</h3>
                    {notice && (
                        <div style={{ margin: '8px 0 12px', padding: '10px 12px', background: '#12371d', border: '1px solid #1e6b2e', color: '#9ff6b1', borderRadius: 6 }}>
                            {notice}
                        </div>
                    )}
                    {isAuthenticated && (
                        <>
                            {myReviewId && !isEditingMyReview ? (
                                <div style={{ marginBottom: '16px', padding: '12px', border: '1px solid #333', borderRadius: 8, position: 'relative' }}>
                                    <button 
                                        type="button"
                                        aria-label="More options"
                                        onClick={() => setMenuOpenReviewId(menuOpenReviewId === 'mine' ? null : 'mine')}
                                        style={{ position: 'absolute', right: 8, top: 8, background: 'transparent', color: '#ddd', border: 'none', cursor: 'pointer', fontSize: 18, padding: 4 }}
                                    >
                                        ⋮
                                    </button>
                                    {menuOpenReviewId === 'mine' && (
                                        <div style={{ position: 'absolute', right: 8, top: 32, background: '#1e1e1e', border: '1px solid #333', borderRadius: 6, minWidth: 120, zIndex: 3 }}>
                                            <button type="button" onClick={() => { setIsEditingMyReview(true); setMenuOpenReviewId(null); }} style={{ width: '100%', textAlign: 'left', padding: '8px 12px', background: 'transparent', color: '#fff', border: 'none', cursor: 'pointer' }}>Edit</button>
                                            <button type="button" onClick={() => { setMenuOpenReviewId(null); handleDeleteMyReview(); }} style={{ width: '100%', textAlign: 'left', padding: '8px 12px', background: 'transparent', color: '#ff5f5f', border: 'none', cursor: 'pointer' }}>Delete</button>
                                        </div>
                                    )}
                                    <div style={{ marginBottom: 6, fontWeight: 600 }}>Your review</div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                                        <StarRating value={myRating} onChange={() => {}} />
                                        <span>{myRating.toFixed(1)} / 5</span>
                                    </div>
                                    {myComment && <div style={{ opacity: 0.9 }}>{myComment}</div>}
                                </div>
                            ) : (
                                <form onSubmit={handleSubmitReview} className="review-form" style={{ marginBottom: '16px', display: 'grid', gap: '8px' }}>
                                    <div>
                                        <div style={{ marginBottom: 6 }}>Your Rating:</div>
                                        <StarRating value={myRating} onChange={setMyRating} />
                                        <div style={{ marginLeft: 8, display: 'inline-block' }}>{myRating ? myRating.toFixed(1) : ''}</div>
                                    </div>
                                    <label>
                                        Comment (optional):
                                        <textarea value={myComment} onChange={(e) => setMyComment(e.target.value)} rows={3} />
                                    </label>
                                    <div style={{ display: 'flex', gap: 8 }}>
                                        <button type="submit">{myReviewId ? 'Save Changes' : 'Submit Review'}</button>
                                        {myReviewId && (
                                            <button type="button" onClick={() => setIsEditingMyReview(false)}>Cancel</button>
                                        )}
                                    </div>
                                </form>
                            )}
                        </>
                    )}
                    {isReviewsLoading && reviews.length === 0 ? (
                        <p>Loading reviews...</p>
                    ) : (
                        <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                            {reviews.map((r) => {
                                const isMine = !!(user && r.userId && (r.userId._id === user._id));
                                return (
                                    <li key={r._id} style={{ padding: '12px 0', borderBottom: '1px solid #333', position: 'relative', display: 'grid', gridTemplateColumns: '40px 1fr', gap: 12 }}>
                                        {isMine && (
                                            <div style={{ position: 'absolute', right: 0, top: 12 }}>
                                                <button 
                                                    type="button" 
                                                    aria-label="More options" 
                                                    onClick={() => setMenuOpenReviewId(menuOpenReviewId === r._id ? null : r._id)}
                                                    style={{ background: 'transparent', color: '#ddd', border: 'none', cursor: 'pointer', fontSize: 18 }}
                                                >
                                                    ⋮
                                                </button>
                                                {menuOpenReviewId === r._id && (
                                                    <div style={{ position: 'absolute', right: 0, marginTop: 6, background: '#1e1e1e', border: '1px solid #333', borderRadius: 6, minWidth: 120, zIndex: 2 }}>
                                                        <button type="button" onClick={() => { setMyReviewId(r._id); setMyRating(r.rating || 0); setMyComment(r.comment || ""); setMenuOpenReviewId(null); }} style={{ width: '100%', textAlign: 'left', padding: '8px 12px', background: 'transparent', color: '#fff', border: 'none', cursor: 'pointer' }}>Edit</button>
                                                        <button type="button" onClick={() => { setMenuOpenReviewId(null); handleDeleteMyReview(); }} style={{ width: '100%', textAlign: 'left', padding: '8px 12px', background: 'transparent', color: '#ff5f5f', border: 'none', cursor: 'pointer' }}>Delete</button>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                        <div>
                                            <img src={r.userId?.profile_picture || 'https://ui-avatars.com/api/?background=222&color=fff&name=' + encodeURIComponent(r.userId?.name || 'U')}
                                                 alt="avatar"
                                                 style={{ width: 36, height: 36, borderRadius: '50%', objectFit: 'cover' }} />
                                        </div>
                                        <div>
                                            <div style={{ fontWeight: 600, paddingRight: 40 }}>{r.userId?.name || 'User'}</div>
                                            <div>Rating: {r.rating} / 5</div>
                                            {r.comment && <div style={{ opacity: 0.9 }}>{r.comment}</div>}
                                            <div style={{ fontSize: '12px', opacity: 0.7 }}>{new Date(r.createdAt).toLocaleString()}</div>
                                        </div>
                                    </li>
                                );
                            })}
                        </ul>
                    )}
                    {reviewsHasMore && (
                        <button disabled={isReviewsLoading} onClick={() => setReviewsPage(p => p + 1)} style={{ marginTop: '12px' }}>
                            {isReviewsLoading ? 'Loading...' : 'Load more'}
                        </button>
                    )}
                </div>
                </div>
            </div>
        </div>
    );
};

export default MovieDetails;