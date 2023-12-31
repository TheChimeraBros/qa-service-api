require('dotenv').config();
const { Client } = require('pg');

const db = new Client({
  user: process.env.PGUSER,
  host: process.env.PGHOST,
  database: process.env.PGDATABASE,
  password: process.env.PGPASSWORD,
  port: process.env.PGPORT
});

db.connect()
  .then(() => {
    console.log('Setting up database');
  })
  .catch((err) => {
    console.error('Error connecting to database', err);
  })
  .then(() => {
    return db.query('DROP TABLE IF EXISTS temp_answers');
  })
  .then(() => {
    return db.query('DROP TABLE IF EXISTS temp_questions');
  })
  .then(() => {
    return db.query('DROP TABLE IF EXISTS photos');
  })
  .then(() => {
    return db.query('DROP TABLE IF EXISTS answers');
  })
  .then(() => {
    return db.query('DROP TABLE IF EXISTS questions');
  })
  .then(() => {
    console.log('Creating & seeding "questions" table');
    return db.query(`
      CREATE TABLE temp_questions (
        id SERIAL PRIMARY KEY,
        body TEXT NOT NULL,
        date BIGINT,
        asker_name VARCHAR(30) NOT NULL,
        asker_email VARCHAR(320) NOT NULL,
        helpfulness INTEGER NOT NULL DEFAULT 0,
        reported BOOLEAN NOT NULL DEFAULT FALSE,
        product_id INT NOT NULL
      )
    `);
  })
  .catch((err) => {
    console.error('Error creating temp_questions table', err);
  })
  .then(() => {
    return db.query(`
      CREATE TABLE questions (
        id SERIAL PRIMARY KEY,
        body TEXT NOT NULL,
        date TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
        asker_name VARCHAR(30) NOT NULL,
        asker_email VARCHAR(320) NOT NULL,
        helpfulness INTEGER NOT NULL DEFAULT 0,
        reported BOOLEAN NOT NULL DEFAULT FALSE,
        product_id INT NOT NULL
      )
    `);
  })
  .then(() => {
    return db.query('CREATE INDEX questions_product_id_idx ON questions (product_id)');
  })
  .catch((err) => {
    console.error('Error creating questions table', err);
  })
  .then(() => {
    return db.query(`
      COPY temp_questions (id, product_id, body, date, asker_name, asker_email, reported, helpfulness) FROM '${process.env.QUESTIONS_PATH}' WITH DELIMITER ',' CSV HEADER
    `);
  })
  .catch((err) => {
    console.error('Error copying contents of questions.csv to temp_questions table', err);
  })
  .then(() => {
    return db.query(`
    INSERT INTO questions (id, body, date, asker_name, asker_email, helpfulness, reported, product_id) SELECT id, body, TIMESTAMP 'epoch' + date * INTERVAL '1 milliseconds', asker_name, asker_email, helpfulness, reported, product_id FROM temp_questions;
    `);
  })
  .then(() => {
    return db.query(`
    SELECT setval(pg_get_serial_sequence('questions', 'id'), (SELECT MAX(id) FROM questions) + 1)
    `);
  })
  .then(() => {
    console.log('Table "questions" created & seeded');
  })
  .catch((err) => {
    console.error('Error transfering from temp_questions to questions table', err);
  })
  .then(() => {
    console.log('Creating & seeding "answers" table');
    return db.query(`
      CREATE TABLE temp_answers (
        id SERIAL PRIMARY KEY,
        body TEXT NOT NULL,
        date BIGINT,
        answerer_name VARCHAR(30) NOT NULL,
        answerer_email VARCHAR(320) NOT NULL,
        helpfulness INTEGER NOT NULL DEFAULT 0,
        reported BOOLEAN NOT NULL DEFAULT FALSE,
        question_id INT NOT NULL,
        FOREIGN KEY (question_id) REFERENCES questions(id)
      )
    `);
  })
  .catch((err) => {
    console.error('Error creating temp_answers table', err);
  })
  .then(() => {
    return db.query(`
      CREATE TABLE answers (
        id SERIAL PRIMARY KEY,
        body TEXT NOT NULL,
        date TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
        answerer_name VARCHAR(30) NOT NULL,
        answerer_email VARCHAR(320) NOT NULL,
        helpfulness INTEGER NOT NULL DEFAULT 0,
        reported BOOLEAN NOT NULL DEFAULT FALSE,
        question_id INT NOT NULL,
        FOREIGN KEY (question_id) REFERENCES questions(id)
      )
    `);
  })
  .then(() => {
    return db.query('CREATE INDEX answers_question_id_idx ON answers (question_id)');
  })
  .catch((err) => {
    console.error('Error creating answers table', err);
  })
  .then(() => {
    return db.query(`
      COPY temp_answers (id, question_id, body, date, answerer_name, answerer_email, reported, helpfulness) FROM '${process.env.ANSWERS_PATH}' WITH DELIMITER ',' CSV HEADER
    `);
  })
  .catch((err) => {
    console.error('Error copying contents of answers.csv to temp_answers table', err);
  })
  .then(() => {
    return db.query(`
      INSERT INTO answers (id, body, date, answerer_name, answerer_email, helpfulness, reported, question_id) SELECT id, body, TIMESTAMP 'epoch' + date * INTERVAL '1 milliseconds', answerer_name, answerer_email, helpfulness, reported, question_id FROM temp_answers;
    `);
  })
  .then(() => {
    return db.query(`
    SELECT setval(pg_get_serial_sequence('answers', 'id'), (SELECT MAX(id) FROM answers) + 1)
    `);
  })
  .then(() => {
    console.log('Table "answers" created & seeded');
  })
  .catch((err) => {
    console.error('Error transfering from temp_answers to answers table', err);
  })
  .then(() => {
    console.log('Creating & seeding "photos" table');
    return db.query(`
      CREATE TABLE photos (
        id SERIAL PRIMARY KEY,
        url TEXT NOT NULL,
        answer_id INT NOT NULL,
        FOREIGN KEY (answer_id) REFERENCES answers(id)
      )
    `);
  })
  .then(() => {
    return db.query('CREATE INDEX photos_answer_id_idx ON photos (answer_id)');
  })
  .catch((err) => {
    console.error('Error creating photos table', err);
  })
  .then(() => {
    return db.query(`
      COPY photos (id, answer_id, url) FROM '${process.env.PHOTOS_PATH}' WITH DELIMITER ',' CSV HEADER
    `);
  })
  .then(() => {
    return db.query(`
    SELECT setval(pg_get_serial_sequence('photos', 'id'), (SELECT MAX(id) FROM photos) + 1)
    `);
  })
  .then(() => {
    console.log('Table "photos" created & seeded');
  })
  .catch((err) => {
    console.error('Error seeding photos table', err);
  })
  .then(() => {
    return db.query('DROP TABLE temp_answers');
  })
  .catch((err) => {
    console.error('Error dropping temp_answers table', err);
  })
  .then(() => {
    return db.query('DROP TABLE temp_questions');
  })
  .catch((err) => {
    console.error('Error dropping temp_questions table', err);
  })
  .then(() => {
    console.log('Successfully created tables & seeded w/ data');
    db.end();
  })
  .catch((err) => {
    console.error('Something failed:', err);
  });