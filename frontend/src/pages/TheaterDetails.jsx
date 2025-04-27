// src/pages/TheaterDetails.jsx
import React, { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
// *** Corrected Import Name ***
import { getTheaterDetails, getShowtimesByTheaterId } from "../api/api";
import moment from 'moment-timezone'; // Import moment-timezone
import "./TheaterDetails.css"; // Ensure this CSS file exists and is styled
// import { useCity } from "../context/CityContext"; // Keep if needed elsewhere, but not used in this component's logic

// Define the target timezone (consistent with backend and other components)
const TARGET_TIMEZONE = 'Asia/Kolkata';

const TheaterDetails = () => {
    const { theaterId } = useParams(); // Get theater ID from URL
    // const { selectedCity } = useCity(); // Context variable available if needed

    // State variables
    const [theater, setTheater] = useState(null);
    const [allShowtimes, setAllShowtimes] = useState([]); // Store raw showtimes from API
    const [groupedShowtimes, setGroupedShowtimes] = useState({}); // Showtimes grouped by movie title
    // Default date is today in IST, formatted as YYYY-MM-DD
    const [selectedDate, setSelectedDate] = useState(moment().tz(TARGET_TIMEZONE).format('YYYY-MM-DD'));
    const [loadingTheater, setLoadingTheater] = useState(true);
    const [loadingShowtimes, setLoadingShowtimes] = useState(false);
    const [error, setError] = useState(null);

    // Effect to fetch Theater Details
    useEffect(() => {
        let isMounted = true;
        setLoadingTheater(true);
        setError(null); // Clear previous errors

        getTheaterDetails(theaterId)
            .then(data => {
                if (isMounted) {
                    // Adjust based on your actual API response structure for getTheaterDetails
                    // It might return { theater: {...} } or just the theater object
                    setTheater(data.theater || data);
                }
            })
            .catch(err => {
                console.error(`Error fetching theater details for ID ${theaterId}:`, err);
                if (isMounted) {
                     setError('Failed to load theater details.');
                     setTheater(null); // Ensure theater state is null on error
                }
            })
            .finally(() => {
                if (isMounted) setLoadingTheater(false);
            });

        return () => { isMounted = false; }; // Cleanup function
    }, [theaterId]); // Re-run only if theaterId changes

    // Effect to fetch Showtimes when theaterId or selectedDate changes
    useEffect(() => {
        if (!theaterId) {
             setAllShowtimes([]); // Clear showtimes if no theater ID
             setGroupedShowtimes({});
             return;
        }

        let isMounted = true;
        setLoadingShowtimes(true);
        setError(null); // Clear previous showtime errors
        setAllShowtimes([]); // Clear previous showtimes before fetching new ones
        setGroupedShowtimes({});

        // Prepare query parameters for the API call
        const queryParams = {
            date: selectedDate, // Pass selected date string
        };

        console.log(`Fetching showtimes for Theater ${theaterId}, Date: ${selectedDate}`);

        // *** Use the correctly imported function and parameters ***
        getShowtimesByTheaterId(theaterId, queryParams)
            .then(data => {
                if (isMounted) {
                    // Assuming the API returns an array of showtime objects directly
                    const fetchedShowtimes = Array.isArray(data) ? data : [];
                    console.log("Fetched Showtimes data:", fetchedShowtimes);
                    
                    // Process the showtimes to ensure all required data is available
                    const processedShowtimes = fetchedShowtimes.map(showtime => {
                        // Get the screen format from the API response
                        const screenFormat = showtime.screen_format || showtime.screen_id?.format || 'N/A';
                        console.log("Processing showtime:", {
                            id: showtime._id,
                            screen_id: showtime.screen_id,
                            original_format: showtime.screen_format,
                            computed_format: screenFormat
                        });
                        return {
                            ...showtime,
                            screen_format: screenFormat
                        };
                    });
                    
                    console.log("Processed Showtimes:", processedShowtimes);
                    setAllShowtimes(processedShowtimes);
                }
            })
            .catch(err => {
                console.error(`Error fetching showtimes for theater ${theaterId} on ${selectedDate}:`, err);
                if (isMounted) setError('Failed to load showtimes for the selected date.');
            })
            .finally(() => {
                if (isMounted) setLoadingShowtimes(false);
            });

        return () => { isMounted = false; }; // Cleanup function
    }, [theaterId, selectedDate]); // Re-run if theaterId or selectedDate changes

    // Effect to group showtimes whenever allShowtimes changes
     useEffect(() => {
         const groupShows = (shows) => {
            if (!Array.isArray(shows)) return {};

            const nowIST = moment().tz(TARGET_TIMEZONE); // Current time for filtering past shows

             return shows.reduce((acc, showtime) => {
                 // Skip shows with missing critical data or cancelled status
                 if (!showtime || !showtime.start_time) {
                    console.warn("Skipping showtime with missing data:", showtime);
                    return acc;
                 }

                 // Skip cancelled shows explicitly
                 if (showtime.status === 'cancelled') {
                    console.log("Skipping cancelled showtime:", showtime);
                    return acc;
                 }

                 // Filter out past showtimes
                 const showStartTimeIST = moment(showtime.start_time).tz(TARGET_TIMEZONE);
                 if (showStartTimeIST.isBefore(nowIST)) {
                    console.log("Skipping past showtime:", showtime);
                    return acc; // Skip past shows
                 }

                 // Use movie_title if available, otherwise fallback
                 const movieTitle = showtime.movie_id?.title || showtime.movie_title || 'Unknown Movie';

                 if (!acc[movieTitle]) {
                     acc[movieTitle] = { 
                         showtimes: [], 
                         movieId: showtime.movie_id?._id || showtime.movie_id 
                     };
                 }

                 // Add the showtime to the group with screen format
                 const showtimeWithFormat = {
                     ...showtime,
                     screen_format: showtime.screen_format || showtime.screen_id?.format || 'N/A'
                 };
                 acc[movieTitle].showtimes.push(showtimeWithFormat);
                 
                 // Sort showtimes within the movie group by time
                 acc[movieTitle].showtimes.sort((a, b) =>
                   moment(a.start_time).valueOf() - moment(b.start_time).valueOf()
                 );

                 return acc;
             }, {});
         };

         console.log("Grouping showtimes:", allShowtimes);
         const groupedResults = groupShows(allShowtimes);
         console.log("Grouped Showtimes:", groupedResults);
         setGroupedShowtimes(groupedResults);
     }, [allShowtimes]); // Re-run grouping when raw showtimes data updates

    // Add the getAvailabilityStatus function from Showtimes.jsx
    const getAvailabilityStatus = (showtime) => {
        const totalSeats = showtime.total_seats || 0;
        const bookedSeatsCount = showtime.booked_seats_count || 0;

        if (totalSeats === 0) {
            return { status: 'unknown' };
        }

        const availableSeats = totalSeats - bookedSeatsCount;
        const percentageAvailable = (availableSeats / totalSeats) * 100;

        if (availableSeats <= 0) {
            return { status: 'soldout' };
        } else if (percentageAvailable <= 10) {
            return { status: 'few' };
        } else if (percentageAvailable <= 50) {
            return { status: 'limited' };
        } else {
            return { status: 'plenty' };
        }
    };

    // Add the getStatusText function from Showtimes.jsx
    const getStatusText = (status) => {
        const statusMap = {
            few: 'Few Seats Left',
            limited: 'Limited Seats',
            soldout: 'Sold Out',
            plenty: ''
        };
        return statusMap[status] || '';
    };

    // --- Helper Functions ---

    // Generates date range for selector based on IST dates
    const generateDateRange = (startDate, days) => {
        const range = [];
        const current = moment(startDate).tz(TARGET_TIMEZONE).startOf('day');
        for (let i = 0; i < days; i++) {
            range.push(current.format('YYYY-MM-DD'));
            current.add(1, 'day');
        }
        return range;
    };

    // Format date for display in the date cards (using IST)
    const formatDateForCard = (dateString) => {
         const dateObj = moment.tz(dateString, 'YYYY-MM-DD', TARGET_TIMEZONE);
         const dayName = dateObj.format('ddd').toUpperCase();
         const dayOfMonth = dateObj.format('D');
         const monthName = dateObj.format('MMM').toUpperCase();
         return { dayName, dayOfMonth, monthName };
    };

    // Format time for display, ensuring IST
    const formatTimeIST = (utcTimeString) => {
        if (!utcTimeString) return 'N/A';
        return moment(utcTimeString).tz(TARGET_TIMEZONE).format('h:mm A'); // e.g., 2:30 PM
    };

    // --- Handlers ---
    const handleDateChange = (date) => { // date is 'YYYY-MM-DD' string
        setSelectedDate(date);
    };

    // --- Render Logic ---
    if (loadingTheater) return <div className="loading">Loading Theater Details...</div>;
    // Show error only if theater details failed to load initially
    if (error && !theater) return <div className="error">{error}</div>;
    if (!theater) return <div className="error">Theater details not found (ID: {theaterId}).</div>;

    return (
        <div className="theater-details-page-container">
            {/* Theater Header */}
            <div className="theater-info-header">
                <h1>{theater.name}</h1>
                <p className="theater-location">{theater.location || 'Location not specified'}, {theater.city || 'City not specified'}</p>
                {/* Add more theater details here if available */}
            </div>

            {/* Date Selector */}
            <div className="date-selector theater-date-selector"> {/* Added specific class */}
                 {generateDateRange(new Date(), 7).map(date => { // date is 'YYYY-MM-DD'
                    const { dayName, dayOfMonth, monthName } = formatDateForCard(date);
                    return (
                        <button
                            key={date}
                            className={`date-card ${selectedDate === date ? 'active' : ''}`}
                            onClick={() => handleDateChange(date)}
                             aria-label={`Select date ${dayName} ${dayOfMonth} ${monthName}`}
                        >
                            <span className="day-name">{dayName}</span>
                            <span className="date-day">{dayOfMonth}</span>
                            <span className="date-month">{monthName}</span>
                        </button>
                    );
                })}
            </div>

            {/* Display error related to fetching showtimes */}
            {error && <p className="error-message">{error}</p>}

            {/* Showtimes Section */}
            <div className="movies-showtimes-section">
                 <h2>
                    Showtimes for {moment.tz(selectedDate, 'YYYY-MM-DD', TARGET_TIMEZONE).format('MMMM D, YYYY')}
                 </h2>
                {loadingShowtimes ? (
                    <div className="loading">Loading Showtimes...</div>
                ) : Object.keys(groupedShowtimes).length > 0 ? (
                    Object.entries(groupedShowtimes).map(([movieTitle, { showtimes: movieShowtimes, movieId }]) => (
                        <div key={movieTitle} className="movie-showtime-card">
                            <div className="movie-header">
                                <h3>{movieTitle}</h3>
                                {movieId && (
                                    <Link to={`/movies/${movieId}`} className="view-movie-details-link">
                                        View Movie Details
                                    </Link>
                                )}
                            </div>
                            <div className="showtimes-grid">
                                {movieShowtimes.map(showtime => {
                                    const showtimeKey = showtime._id;
                                    const screenId = showtime.screen_id;

                                    if (!showtimeKey || !screenId) {
                                        console.warn("Missing showtime data:", showtime);
                                        return null;
                                    }

                                    const displayTime = formatTimeIST(showtime.start_time);
                                    const { status } = getAvailabilityStatus(showtime);
                                    const statusText = getStatusText(status);
                                    
                                    // Get screen format directly from the showtime object
                                    const screenFormat = showtime.screen_format;

                                    // Render a non-clickable div for sold out shows
                                    if (status === 'soldout') {
                                        return (
                                            <div
                                                key={showtimeKey}
                                                className={`showtime-slot ${status}`}
                                                data-status={statusText}
                                                aria-label={`${displayTime} show is sold out`}
                                                title="Sold Out"
                                            >
                                                {displayTime}
                                                {screenFormat && screenFormat !== 'N/A' && (
                                                    <span className="screen-format">{screenFormat}</span>
                                                )}
                                            </div>
                                        );
                                    }

                                    // Render a Link for available/filling shows
                                    return (
                                        <Link
                                            key={showtimeKey}
                                            to={`/booking/screen/${screenId}/showtime/${showtimeKey}`}
                                            className={`showtime-slot ${status}`}
                                            data-status={statusText}
                                            aria-label={`Book tickets for ${displayTime}`}
                                            title={`Book ${displayTime} show${status !== 'plenty' ? ' - ' + statusText : ''}`}
                                        >
                                            {displayTime}
                                            {screenFormat && screenFormat !== 'N/A' && (
                                                <span className="screen-format">{screenFormat}</span>
                                            )}
                                        </Link>
                                    );
                                })}
                            </div>
                        </div>
                    ))
                ) : (
                    !error && <p className='no-showtimes'>No upcoming showtimes found for this theater on {moment.tz(selectedDate, 'YYYY-MM-DD', TARGET_TIMEZONE).format('MMMM D')}.</p>
                )}
            </div>
        </div>
    );
};

export default TheaterDetails;