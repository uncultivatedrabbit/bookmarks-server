const express = require("express");
const bodyParser = express.json();
const bookmarksRouter = express.Router();
const { v4: uuid } = require("uuid");
const logger = require('../logger')
const { bookmarks } = require("../store");

bookmarksRouter
  .route("/bookmark")
  .get((req, res) => {
    res.json(bookmarks);
  })
  .post(bodyParser, (req, res) => {
    const { title, content } = req.body;

    if (!title) {
      logger.error("Title is required");
      return res.status(400).send("Invalid data");
    }

    if (!content) {
      logger.error("Content is required");
      return res.status(400).send("Invalid data");
    }
    const id = uuid();
    const bookmark = { id, title, content };
    bookmarks.push(bookmark);
    logger.info(`Bookmark with id ${id} created!`);

    res
      .status(201)
      .location(`http://localhost:8000/bookmark/${id}`)
      .json(bookmark);
  });

bookmarksRouter
  .route("/bookmark/:id")
  .get((req, res) => {
    const { id } = req.params;
    const bookmark = bookmarks.find((b) => String(b.id) === id);
    if (!bookmark) {
      logger.error(`Bookmark with id ${id} not found.`);
      return res.status(404).send("Bookmark not found!");
    }
    res.json(bookmark);
  })
  .delete((req, res) => {
    const { id } = req.params;
    const bookmarkIndex = bookmarks.findIndex((b) => String(b.id) === id);
    if (bookmarkIndex === -1) {
      logger.error(`Bookmark with id ${id} not found.`);
      return res.status(400).send("Not found");
    }
    bookmarks.splice(bookmarkIndex, 1);
    logger.info(`Card with id ${id} deleted!`);
    res.status(204).end();
  });

module.exports = bookmarksRouter;
