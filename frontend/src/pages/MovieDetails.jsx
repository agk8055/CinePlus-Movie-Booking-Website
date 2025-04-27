import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getMovieById } from "../api/api"; // Make sure path is correct
import "./MovieDetails.css";

const MovieDetails = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [movie, setMovie] = useState(null);
    const [showtimes, setShowtimes] = useState([]); // State to store showtimes
    const [loading, setLoading] = useState(true); // Optional loading state
    const [error, setError] = useState(null);     // Optional error state

    useEffect(() => {
        const fetchMovieDetails = async () => {
            setLoading(true); // Set loading to true when fetching starts
            setError(null);   // Clear any previous errors
            try {
                console.log('Fetching movie with ID:', id);
                const response = await getMovieById(id);
                console.log('Fetched movie details and showtimes:', response);
                setMovie(response.movie); // Access movie details from response.movie
                setShowtimes(response.showtimes); // Access showtimes from response.showtimes
            } catch (error) {
                console.error("Error fetching movie details:", error);
                setError(error); // Set error state
            } finally {
                setLoading(false); // Set loading to false when fetching is complete (success or error)
            }
        };

        fetchMovieDetails();
    }, [id]);

    if (loading) {
        return <div className="loading">Loading...</div>; // Optional loading indicator
    }

    if (error) {
        return <div className="error">Error: {error.message}</div>; // Optional error display
    }

    if (!movie) {
        return <div className="not-found">Movie not found.</div>; // Handle case where movie is not found
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
            <div className="movie-backdrop" style={{ backgroundImage: `url(${movie.backdrop_url})` }}>
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
                                day: "numeric",
                                month: "short",
                                year: "numeric",
                            })}</span>
                            <span className="dot-separator">•</span>
                            <span>{movie.genre}</span>
                        </div>

                        <div className="movie-details-about">
                            <h3>About the movie</h3>
                            <p>{movie.description}</p>
                        </div>

                        <div className="action-buttons">
                            {showtimes.length > 0 ? (
                                <button className="book-tickets-button" onClick={handleBookNow}>
                                    <svg className="ticket-icon" viewBox="0 0 24 24">
                                        <path d="M15.58 16.8L12 14.5l-3.58 2.3 1.08-4.12L6.21 10l4.25-.26L12 5.8l1.54 3.94 4.25.26-3.29 2.68 1.08 4.12zM20 12c0-1.1.9-2 2-2V6c0-1.1-.9-2-2-2H4c-1.1 0-2 .9-2 2v4c1.1 0 2 .9 2 2s-.9 2-2 2v4c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2v-4c-1.1 0-2-.9-2-2z"/>
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
                                    <path d="M8 5v14l11-7z"/>
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