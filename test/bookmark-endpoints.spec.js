const { expect } = require("chai");
const knex = require("knex");
const app = require("../src/app");
const { makeBookmarksArray } = require("./bookmarks.fixtures");

describe.only("Bookmark endpoint", function () {
  let db;
  before("make knex instance", () => {
    db = knex({
      client: "pg",
      connection: process.env.TEST_DB_URL,
    });
    app.set("db", db);
  });

  after("disconnect from db", () => db.destroy());

  before("clean the table", () => db("bookmarks").truncate());

  afterEach("cleanup", () => db("bookmarks").truncate());

  describe("GET /bookmark", () => {
    // WHEN THERE ARE BOOKMARKS IN DB
    context("Given there are bookmarks in the database", () => {
      const testBookmarks = makeBookmarksArray();

      beforeEach("insert bookmarks", () => {
        return db.into("bookmarks").insert(testBookmarks);
      });

      it("GET /bookmark responds with 200 and all of the bookmarks", () => {
        return supertest(app).get("/bookmark").expect(200, testBookmarks);
      });
    });
    //WHEN THERE ARE NO BOOKMARKS IN DB
    context("given no bookmarks", () => {
      it("responds with 200 and empty array", () => {
        return supertest(app).get("/bookmark").expect(200, []);
      });
    });
  });

  describe("GET /bookmark/:id", () => {
    context("Given there are bookmarks in the database", () => {
      const testBookmarks = makeBookmarksArray();

      beforeEach("insert bookmarks", () => {
        return db.into("bookmarks").insert(testBookmarks);
      });

      it("GET /bookmarks/:id responds with a 200 and the specified bookmark", () => {
        const bookmarkId = 2;
        const expectedBookmark = testBookmarks[bookmarkId - 1];
        return supertest(app)
          .get(`/bookmark/${bookmarkId}`)
          .expect(200, expectedBookmark);
      });
    });

    context("Given no bookmarks in the db", () => {
      it("responds with a 404", () => {
        const bookmarkId = 6854;
        return supertest(app)
          .get(`/bookmark/${bookmarkId}`)
          .expect(404, { error: { message: "Bookmark doesn't exist." } });
      });
    });
  });
});
