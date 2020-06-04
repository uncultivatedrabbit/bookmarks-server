const express = require("express");
const bodyParser = express.json();
const bookmarksRouter = express.Router();
const logger = require("../logger");
const { bookmarks } = require("../store");
const BookmarkServices = require("../bookmark-services");
const xss = require("xss");

bookmarksRouter
  .route("/bookmark")
  .get((req, res, next) => {
    const knexInstance = req.app.get("db");
    BookmarkServices.getAllBookmarks(knexInstance)
      .then((bookmark) => {
        res.json(
          bookmark.map((b) => ({
            id: b.id,
            title: xss(b.title),
            description: xss(b.description),
            rating: +b.rating,
            date_published: b.date_published,
          }))
        );
      })
      .catch(next);
  })
  .post(bodyParser, (req, res, next) => {
    const { title, description, rating } = req.body;
    const newBookmark = { title, description, rating };

    for (const [key, value] of Object.entries(newBookmark)) {
      if (value == null) {
        return res.status(400).json({
          error: { message: `Missing ${key} in request body` },
        });
      }
    }
    BookmarkServices.insertBookmark(req.app.get("db"), newBookmark)
      .then((bookmark) => {
        logger.info(`Bookmark created!`);
        res.status(201).location(`/bookmark/${bookmark.id}`).json(bookmark);
      })
      .catch(next);
  });

bookmarksRouter
  .route("/bookmark/:id")
  .get((req, res, next) => {
    const knexInstance = req.app.get("db");
    BookmarkServices.getById(knexInstance, req.params.id)
      .then((bookmark) => {
        if (!bookmark) {
          return res.status(404).json({
            error: { message: "Bookmark doesn't exist." },
          });
        }
        res.json(bookmark);
      })
      .catch(next);
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
