// ==========================================
// controllers/taskController.js
// CRUD for tasks + filtering/search
// ==========================================

const Task = require('../models/Task');

// ── GET /api/tasks ─── Get tasks (with filters)
const getTasks = async (req, res) => {
  try {
    const { status, priority, projectId, search } = req.query;

    // Build filter object dynamically based on query params
    let filter = {};

    if (req.user.role !== 'admin') {
      // Regular users only see tasks assigned to them
      filter.assignedTo = req.user._id;
    }

    if (status)    filter.status   = status;
    if (priority)  filter.priority = priority;
    if (projectId) filter.projectId = projectId;

    // Text search on title
    if (search) {
      filter.title = { $regex: search, $options: 'i' }; // case-insensitive
    }

    const tasks = await Task.find(filter)
      .populate('assignedTo', 'name email')
      .populate('projectId',  'title')
      .populate('createdBy',  'name')
      .sort('-createdAt');

    res.json({ success: true, count: tasks.length, tasks });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── GET /api/tasks/:id ─── Get single task ───
const getTaskById = async (req, res) => {
  try {
    const task = await Task.findById(req.params.id)
      .populate('assignedTo', 'name email')
      .populate('projectId',  'title')
      .populate('createdBy',  'name');

    if (!task) return res.status(404).json({ success: false, message: 'Task not found' });

    res.json({ success: true, task });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── POST /api/tasks ─── Create task ──────────
const createTask = async (req, res) => {
  try {
    const { title, description, status, priority, deadline, assignedTo, projectId } = req.body;

    const task = await Task.create({
      title, description, status, priority, deadline, assignedTo, projectId,
      createdBy: req.user._id,
    });

    res.status(201).json({ success: true, task });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── PUT /api/tasks/:id ─── Update task ───────
const updateTask = async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ success: false, message: 'Task not found' });

    // Regular users can only update STATUS of tasks assigned to them
    if (req.user.role !== 'admin') {
      if (task.assignedTo?.toString() !== req.user._id.toString()) {
        return res.status(403).json({ success: false, message: 'Not authorized' });
      }
      // Users can only change status, not other fields
      const updated = await Task.findByIdAndUpdate(
        req.params.id,
        { status: req.body.status },
        { new: true }
      );
      return res.json({ success: true, task: updated });
    }

    // Admins can update everything
    const updated = await Task.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    res.json({ success: true, task: updated });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── DELETE /api/tasks/:id ─── Delete task ────
const deleteTask = async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ success: false, message: 'Task not found' });

    await task.deleteOne();
    res.json({ success: true, message: 'Task deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── GET /api/tasks/stats ─── Dashboard stats ─
const getTaskStats = async (req, res) => {
  try {
    let matchFilter = {};
    if (req.user.role !== 'admin') matchFilter.assignedTo = req.user._id;

    const stats = await Task.aggregate([
      { $match: matchFilter },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
        },
      },
    ]);

    // Convert array to easy-to-use object
    const result = { pending: 0, 'in-progress': 0, completed: 0 };
    stats.forEach(s => { result[s._id] = s.count; });

    res.json({ success: true, stats: result });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = { getTasks, getTaskById, createTask, updateTask, deleteTask, getTaskStats };
