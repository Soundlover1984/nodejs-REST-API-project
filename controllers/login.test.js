const mongoose = require("mongoose");
const request = require("supertest");
const app = require("../app");

const { DB_HOST } = process.env;

beforeAll(async () => {
  await mongoose.connect(DB_HOST);
});

afterAll(async () => {
  await mongoose.connection.close();
});

describe("Login Controller", () => {
  it("should return a 200 status login", async () => {
    const response = await request(app)
      .post("/api/auth/login")
      .send({ email: "denys@mail.com", password: "denny2001" });
    console.log(response.body);
    expect(response.status).toBe(200);
  });
  it("should return a token as a string", async () => {
    const response = await request(app)
      .post("/api/auth/login")
      .send({ email: "denys@mail.com", password: "denny2001" });

    expect(response.body).toHaveProperty("token");
    expect(typeof response.body.token).toBe("string");
  });
  it("should return a user object with email as a string", async () => {
    const response = await request(app)
      .post("/api/auth/login")
      .send({ email: "denys@mail.com", password: "denny2001" });

    expect(response.body).toHaveProperty("user");
    expect(typeof response.body.user.email).toBe("string");
  });

  it("should return a user object with subscription as a string", async () => {
    const response = await request(app)
      .post("/api/auth/login")
      .send({ email: "denys@mail.com", password: "denny2001" });

    expect(response.body).toHaveProperty("user");
    expect(typeof response.body.user.subscription).toBe("string");
  });
});
