const Comment = require('../models/Comment');
const Case = require('../models/Case');

// @desc    Add a comment to a case
// @route   POST /api/comments/:caseId
// @access  Private
const addComment = async (req, res) => {
  const { text } = req.body;
  const { caseId } = req.params;

  try {
    if (!text) {
      return res.status(400).json({ message: 'Comment text cannot be empty' });
    }

    const caseItem = await Case.findById(caseId);
    if (!caseItem) {
      return res.status(404).json({ message: 'Case not found' });
    }

    // Role check: Agents can only comment on cases assigned to them
    if (
      req.user.role === 'Agent' &&
      (!caseItem.assignedTo || caseItem.assignedTo.toString() !== req.user._id.toString())
    ) {
      return res.status(403).json({ message: 'Access denied: Case is not assigned to you' });
    }

    const newComment = await Comment.create({
      caseId,
      author: req.user._id,
      text,
    });

    const populatedComment = await Comment.findById(newComment._id).populate(
      'author',
      'fullName role'
    );

    return res.status(201).json(populatedComment);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  addComment,
};
