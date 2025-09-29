import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getMovieById, getMovieBookingStats } from "../api/api";
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
                                background: `linear-gradient(to top right, ${color.hex}, #0a0a0a)`
                            });
                        })
                        .catch(e => {
                            console.error("Could not get poster color:", e);
                            setBackdropStyle({
                                background: `linear-gradient(to top right, #222, #0a0a0a)`
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

        fetchStats();
    }, [id, timeframe]);


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
                        </div>
                        
                        {/* UPDATED: Booking stats with toggle */}
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
                </div>
            </div>
        </div>
    );
};

export default MovieDetails;