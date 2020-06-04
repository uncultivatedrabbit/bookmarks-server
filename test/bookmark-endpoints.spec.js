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
  // GET REQUESTS
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

    //MALICIOUS BOOKMARK TEST
    context("Given an XSS attack article", () => {
      const maliciousBookmark = {
        id: 911,
        title: 'Naughty naughty very naughty <script>alert("xss");</script>',
        description: `Bad image <img src="https://url.to.file.which/does-not.exist" onerror="alert(document.cookie);">. But not <strong>all</strong> bad.`,
        rating: 0,
      };
      beforeEach("insert malicious article", () => {
        return db.into("bookmarks").insert([maliciousBookmark]);
      });
      it("removes XSS attack content", () => {
        return supertest(app)
          .get(`/bookmark`)
          .expect(200)
          .expect((res) => {
            expect(res.body[0].title).to.eql(
              'Naughty naughty very naughty &lt;script&gt;alert("xss");&lt;/script&gt;'
            );
            expect(res.body[0].description).to.eql(
              `Bad image <img src="https://url.to.file.which/does-not.exist">. But not <strong>all</strong> bad.`
            );
          });
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
  // POST REQUESTS
  describe("POST /bookmark", () => {
    it("creates a bookmark, responding with 201 and the new bookmark", function () {
      const newBookmark = {
        title: "Test new bookmark",
        description: "Listicle",
        rating: 4,
      };

      return supertest(app)
        .post("/bookmark")
        .send(newBookmark)
        .expect(201)
        .expect((res) => {
          expect(res.body.title).to.eql(newBookmark.title);
          expect(res.body.description).to.eql(newBookmark.description);
          expect(res.body.rating).to.eql(newBookmark.rating);
          expect(res.body).to.have.property("id");
          expect(res.headers.location).to.eql(`/bookmark/${res.body.id}`);
        })
        .then((postRes) =>
          supertest(app)
            .get(`/bookmark/${postRes.body.id}`)
            .expect(postRes.body)
        );
    });
    // MISSING FIELD TESTS
    const requiredFields = ["title", "description", "rating"];

    requiredFields.forEach((field) => {
      const newBookmark = {
        title: "Orange County Black and Blue",
        description: "High School Never Ends",
        rating: 4,
      };
      it(`responds with 400 and an error message when the ${field} is missing`, () => {
        delete newBookmark[field];
        return supertest(app)
          .post("/bookmark")
          .send(newBookmark)
          .expect(400, {
            error: { message: `Missing ${field} in request body` },
          });
      });
    });
  });

  // DELTE tests
  describe("DELETE /bookmark/:id", () => {
    context("Given there are NO bookmarks", () => {
      it("responds with a 404", () => {
        const bookmarkId = 123456;
        return supertest(app)
          .delete(`/bookmark/${bookmarkId}`)
          .expect(404, { error: { message: "Bookmark doesn't exist." } });
      });
    });
    context("Given there are bookmarks in the db", () => {
      const testBookmarks = makeBookmarksArray();

      beforeEach("insert bookmarks", () => {
        return db.into("bookmarks").insert(testBookmarks);
      });

      it("responds with 204 and removes the bookmark", () => {
        const idToRemove = 2;
        const expectedBookmarks = testBookmarks.filter(
          (bookmark) => bookmark.id !== idToRemove
        );
        return supertest(app)
          .delete(`/bookmark/${idToRemove}`)
          .expect(204)
          .then((res) =>
            supertest(app).get("/bookmark").expect(expectedBookmarks)
          );
      });
    });
  });
});
