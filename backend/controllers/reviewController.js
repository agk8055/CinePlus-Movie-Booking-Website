// backend/controllers/reviewController.js
const mongoose = require('mongoose');
const Review = require('../models/Review');
const Movie = require('../models/Movie');

// Helper to recalc average from all reviews for a movie
async function recalcAverageForMovie(movieId) {
    const agg = await Review.aggregate([
        { $match: { movieId: new mongoose.Types.ObjectId(movieId) } },
        { $group: { _id: '$movieId', avg: { $avg: '$rating' }, count: { $sum: 1 } } }
    ]);
    const avg = agg.length ? agg[0].avg : 0;
    const count = agg.length ? agg[0].count : 0;
    await Movie.findByIdAndUpdate(movieId, { avgRatingPoints: avg, reviewCount: count });
    return { avg, count };
}

// Add a new review
exports.addReview = async (req, res, next) => {
    try {
        const { movieId } = req.params;
        const { rating, comment } = req.body;

        if (!mongoose.Types.ObjectId.isValid(movieId)) {
            return res.status(400).json({ message: 'Invalid movie ID format' });
        }
        if (typeof rating !== 'number' || rating < 0.5 || rating > 5) {
            return res.status(400).json({ message: 'Rating must be a number between 0.5 and 5' });
        }

        const movie = await Movie.findById(movieId).select('avgRatingPoints reviewCount');
        if (!movie) {
            return res.status(404).json({ message: 'Movie not found' });
        }

        // Create or update (upsert) user's review for this movie
        const review = await Review.findOneAndUpdate(
            { movieId, userId: req.user.userId },
            { rating, comment },
            { new: true, upsert: true, setDefaultsOnInsert: true }
        );

        // If this was an insert (no prior review), incrementally update avg using provided formula
        // Detect insert by checking createdAt == updatedAt immediately after upsert
        const isInsert = review && review.createdAt && review.updatedAt && (+review.createdAt === +review.updatedAt);

        if (isInsert) {
            const oldAvg = movie.avgRatingPoints || 0;
            const oldCount = movie.reviewCount || 0;
            const newAvg = ((oldAvg * oldCount) + rating) / (oldCount + 1);
            await Movie.findByIdAndUpdate(movieId, {
                avgRatingPoints: newAvg,
                reviewCount: oldCount + 1
            });
        } else {
            // Existing review updated: recalc from all reviews
            await recalcAverageForMovie(movieId);
        }

        res.status(201).json({ message: 'Review saved', review });
    } catch (error) {
        if (error.code === 11000) {
            // Unique index might conflict on rare race, fallback to full recalc
            try {
                await recalcAverageForMovie(req.params.movieId);
            } catch (_) { /* ignore */ }
        }
        next(error);
    }
};

// Update existing review (explicit endpoint)
exports.updateReview = async (req, res, next) => {
    try {
        const { movieId, reviewId } = req.params;
        const { rating, comment } = req.body;

        if (!mongoose.Types.ObjectId.isValid(movieId) || !mongoose.Types.ObjectId.isValid(reviewId)) {
            return res.status(400).json({ message: 'Invalid ID format' });
        }
        const review = await Review.findOneAndUpdate(
            { _id: reviewId, movieId, userId: req.user.userId },
            { rating, comment },
            { new: true }
        );
        if (!review) {
            return res.status(404).json({ message: 'Review not found' });
        }
        await recalcAverageForMovie(movieId);
        res.status(200).json({ message: 'Review updated', review });
    } catch (error) {
        next(error);
    }
};

// Get reviews for a movie with pagination
exports.getReviewsForMovie = async (req, res, next) => {
    try {
        const { movieId } = req.params;
        const page = Math.max(parseInt(req.query.page || '1', 10), 1);
        const limit = Math.min(Math.max(parseInt(req.query.limit || '10', 10), 1), 50);
        const skip = (page - 1) * limit;

        if (!mongoose.Types.ObjectId.isValid(movieId)) {
            return res.status(400).json({ message: 'Invalid movie ID format' });
        }

        const [items, total] = await Promise.all([
            Review.find({ movieId })
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .populate('userId', 'name profile_picture')
                .lean(),
            Review.countDocuments({ movieId })
        ]);

        res.status(200).json({
            items,
            page,
            limit,
            total,
            hasMore: skip + items.length < total
        });
    } catch (error) {
        next(error);
    }
};

// Get current user's review
exports.getMyReview = async (req, res, next) => {
    try {
        const { movieId } = req.params;
        if (!mongoose.Types.ObjectId.isValid(movieId)) {
            return res.status(400).json({ message: 'Invalid movie ID format' });
        }
        const review = await Review.findOne({ movieId, userId: req.user.userId }).lean();
        res.status(200).json({ review });
    } catch (error) {
        next(error);
    }
};

// Delete current user's review and recalc averages
exports.deleteMyReview = async (req, res, next) => {
    try {
        const { movieId } = req.params;
        if (!mongoose.Types.ObjectId.isValid(movieId)) {
            return res.status(400).json({ message: 'Invalid movie ID format' });
        }
        const deleted = await Review.findOneAndDelete({ movieId, userId: req.user.userId });
        if (!deleted) {
            return res.status(404).json({ message: 'Review not found' });
        }
        // Recalculate from all remaining reviews
        const result = await Review.aggregate([
            { $match: { movieId: new mongoose.Types.ObjectId(movieId) } },
            { $group: { _id: '$movieId', avg: { $avg: '$rating' }, count: { $sum: 1 } } }
        ]);
        const avg = result.length ? result[0].avg : 0;
        const count = result.length ? result[0].count : 0;
        await Movie.findByIdAndUpdate(movieId, { avgRatingPoints: avg, reviewCount: count });
        res.status(200).json({ message: 'Review deleted' });
    } catch (error) {
        next(error);
    }
};


