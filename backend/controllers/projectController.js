// ==========================================
// controllers/projectController.js
// CRUD operations for projects
// ==========================================

const Project = require('../models/Project');
const Task    = require('../models/Task');

// ── GET /api/projects ─── Get all projects ──
const getProjects = async (req, res) => {
  try {
    let projects;
    if (req.user.role === 'admin') {
      // Admins see all projects
      projects = await Project.find()
        .populate('createdBy', 'name email')
        .populate('members', 'name email')
        .sort('-createdAt');
    } else {
      // Regular users only see projects they are members of
      projects = await Project.find({ members: req.user._id })
        .populate('createdBy', 'name email')
        .populate('members', 'name email')
        .sort('-createdAt');
    }
    res.json({ success: true, count: projects.length, projects });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── GET /api/projects/:id ─── Get one project
const getProjectById = async (req, res) => {
  try {
    const project = await Project.findById(req.params.id)
      .populate('createdBy', 'name email')
      .populate('members', 'name email');

    if (!project) return res.status(404).json({ success: false, message: 'Project not found' });

    res.json({ success: true, project });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── POST /api/projects ─── Create a project ─
const createProject = async (req, res) => {
  try {
    const { title, description, members, deadline } = req.body;

    const project = await Project.create({
      title,
      description,
      createdBy: req.user._id, // The logged-in user is the creator
      members:   members || [],
      deadline,
    });

    res.status(201).json({ success: true, project });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── PUT /api/projects/:id ─── Update project ─
const updateProject = async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) return res.status(404).json({ success: false, message: 'Project not found' });

    // Only the creator or an admin can update
    if (project.createdBy.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    const updated = await Project.findByIdAndUpdate(req.params.id, req.body, {
      new:        true,  // Return updated document
      runValidators: true,
    });

    res.json({ success: true, project: updated });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── DELETE /api/projects/:id ─── Delete project
const deleteProject = async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) return res.status(404).json({ success: false, message: 'Project not found' });

    // Delete all tasks that belong to this project first
    await Task.deleteMany({ projectId: req.params.id });
    await project.deleteOne();

    res.json({ success: true, message: 'Project and its tasks deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = { getProjects, getProjectById, createProject, updateProject, deleteProject };
