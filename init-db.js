/* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */
/* Initialise Deno/Oak boilerplate database                       © 2024-2025 Chris Veness / MTL  */
/*                                                                                                */
/* SQLite may be a viable production database in some cases, in others a client/server DMBS might */
/* be preferred. In this sample app, the database is recreated from scratch on each restart.      */
/* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */

import SQLite from 'node:sqlite';
import Scrypt from 'scrypt-kdf';

const db = new SQLite.DatabaseSync('app.db');

db.exec('DROP TABLE IF EXISTS TeamMember');
db.exec('DROP TABLE IF EXISTS Team');
db.exec('DROP TABLE IF EXISTS Member');
db.exec('DROP TABLE IF EXISTS User');

// ------------ create tables

const sqlCreateMember = `
    CREATE TABLE Member (
        MemberId  INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
        Firstname TEXT COLLATE NOCASE,
        Lastname  TEXT COLLATE NOCASE,
        Email     TEXT NOT NULL UNIQUE COLLATE NOCASE,
        Active    BOOLEAN
    )`;
db.exec(sqlCreateMember);

const sqlCreateTeam = `
    CREATE TABLE Team (
        TeamId INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
        Name   TEXT NOT NULL COLLATE NOCASE
    )`;
db.exec(sqlCreateTeam);

const sqlCreateTeamMember = `
    CREATE TABLE TeamMember (
        TeamMemberId INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
        MemberId     INTEGER NOT NULL,
        TeamId       INTEGER NOT NULL,
        JoinedOn     DATE NOT NULL,
        UNIQUE (MemberId,TeamId),
        FOREIGN KEY (TeamId) REFERENCES Team(TeamId),
        FOREIGN KEY (MemberId) REFERENCES Member(MemberId)
    )`;
db.exec(sqlCreateTeamMember);

const sqlCreateUser = `
    CREATE TABLE User (
        UserId             INTEGER PRIMARY KEY AUTOINCREMENT,
        Firstname          TEXT COLLATE NOCASE,
        Lastname           TEXT COLLATE NOCASE,
        Email              TEXT NOT NULL UNIQUE COLLATE NOCASE,
        Password           TEXT,
        PasswordResetToken TEXT,
        Role               TEXT
    )`;
db.exec(sqlCreateUser);

// ------------ insert test data

const sqlInsertMember = `
    INSERT INTO Member VALUES
        (100001,'Juan Manuel','Fangio','juan-manuel@fangio.com',false),
        (100002,'Ayrton','Senna','ayrton@senna.com',false),
        (100003,'Michael','Schumacher','michael@schumacher.com',false),
        (100004,'Lewis','Hamilton','lewis@hamilton.com',true)`;
db.exec(sqlInsertMember);

const sqlInsertTeam = `
    INSERT INTO Team VALUES
        (100001,'Ferrari'),
        (100002,'Mercedes'),
        (100003,'McLaren')`;
db.exec(sqlInsertTeam);

const sqlInsertTeamMember = `
    INSERT INTO TeamMember VALUES
        (100001,100001,100001,'1956-01-22'),
        (100002,100001,100002,'1954-01-17'),
        (100003,100002,100003,'1988-04-03'),
        (100004,100003,100001,'1996-03-10'),
        (100005,100003,100002,'2010-03-14'),
        (100006,100004,100002,'2007-03-18'),
        (100007,100004,100003,'2013-03-17')`;
db.exec(sqlInsertTeamMember);

const pw = {
    pwHashGuest: (await Scrypt.kdf('guest', { logN: 12 })).toBase64(),
    pwHashAdmin: (await Scrypt.kdf('admin', { logN: 12 })).toBase64(),
};
const sqlInsertUser = `
    INSERT INTO User VALUES
        (100001,'Guest','User','guest@user.com',:pwHashGuest,null,'guest'),
        (100002,'Admin','User','admin@user.com',:pwHashAdmin,null,'admin')`;
db.prepare(sqlInsertUser).run(pw);
