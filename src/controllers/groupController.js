const groupService = require('../services/groupService');

async function createGroup(req, res) {
  try {
    const { name, description } = req.body;
    const userId = req.userId;

    if (!name) {
      return res.status(400).json({ error: 'Group name is required' });
    }

    const group = await groupService.createGroup(name, description, userId);
    res.status(201).json({ message: 'Group created successfully', group });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}

async function joinGroup(req, res) {
  try {
    const { groupId } = req.params;
    const userId = req.userId;

    const membership = await groupService.joinGroup(parseInt(groupId), userId);
    res.status(200).json({ message: 'Joined group successfully', membership });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}

async function listGroups(req, res) {
  try {
    const userId = req.userId;
    const groups = await groupService.listUserGroups(userId);
    res.status(200).json(groups);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}

async function getAllGroups(req, res) {
  try {
    const groups = await groupService.getAllGroups();
    res.status(200).json(groups);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}

async function getGroupMembers(req, res) {
  try {
    const { groupId } = req.params;
    const members = await groupService.getGroupMembers(parseInt(groupId));
    res.status(200).json(members);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}

async function getGroupDetails(req, res) {
  try {
    const { groupId } = req.params;
    const group = await groupService.getGroupDetails(parseInt(groupId));
    res.status(200).json(group);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}

module.exports = {
  createGroup,
  joinGroup,
  listGroups,
  getAllGroups,
  getGroupMembers,
  getGroupDetails,
};
