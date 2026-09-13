import Database from "better-sqlite3";
import path from "node:path";
import { DATA } from "./paths";

export const db = new Database(path.join(DATA, "engine.db"));
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");
db.pragma("busy_timeout = 5000");
db.exec(`
CREATE TABLE IF NOT EXISTS clients(id TEXT PRIMARY KEY,slug TEXT NOT NULL UNIQUE,profile TEXT NOT NULL,createdAt TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS content(id TEXT PRIMARY KEY,clientId TEXT NOT NULL REFERENCES clients(id),body TEXT NOT NULL,status TEXT NOT NULL DEFAULT 'draft',hash TEXT NOT NULL,createdAt TEXT NOT NULL,scheduledFor TEXT,externalId TEXT,externalProvider TEXT,UNIQUE(clientId,id));
CREATE TABLE IF NOT EXISTS assets(id TEXT PRIMARY KEY,clientId TEXT NOT NULL REFERENCES clients(id),body TEXT NOT NULL,UNIQUE(clientId,id));
CREATE TABLE IF NOT EXISTS signals(id TEXT PRIMARY KEY,clientId TEXT NOT NULL REFERENCES clients(id),source TEXT NOT NULL,title TEXT NOT NULL,text TEXT NOT NULL,url TEXT NOT NULL,fetchedAt TEXT NOT NULL,UNIQUE(clientId,source,url,title));
CREATE TABLE IF NOT EXISTS approvals(clientId TEXT NOT NULL,contentId TEXT NOT NULL,hash TEXT NOT NULL,role TEXT NOT NULL,createdAt TEXT NOT NULL,PRIMARY KEY(clientId,contentId,hash,role),FOREIGN KEY(clientId,contentId) REFERENCES content(clientId,id));
CREATE TABLE IF NOT EXISTS credentials(clientId TEXT NOT NULL REFERENCES clients(id),provider TEXT NOT NULL,sealed TEXT NOT NULL,PRIMARY KEY(clientId,provider));
CREATE TABLE IF NOT EXISTS connections(clientId TEXT NOT NULL REFERENCES clients(id),provider TEXT NOT NULL,platform TEXT NOT NULL,accountId TEXT NOT NULL,label TEXT NOT NULL,PRIMARY KEY(clientId,platform),UNIQUE(provider,platform,accountId));
CREATE TABLE IF NOT EXISTS publishing_accounts(provider TEXT NOT NULL,accountId TEXT NOT NULL,clientId TEXT NOT NULL REFERENCES clients(id),PRIMARY KEY(provider,accountId));
INSERT OR IGNORE INTO publishing_accounts SELECT provider,accountId,clientId FROM connections;
CREATE TABLE IF NOT EXISTS delivery_accounts(clientId TEXT NOT NULL,contentId TEXT NOT NULL,provider TEXT NOT NULL,accountId TEXT NOT NULL,PRIMARY KEY(clientId,contentId),FOREIGN KEY(clientId,contentId) REFERENCES content(clientId,id));
CREATE TABLE IF NOT EXISTS usage(id TEXT PRIMARY KEY,clientId TEXT NOT NULL REFERENCES clients(id),provider TEXT NOT NULL,model TEXT NOT NULL,inputTokens INTEGER NOT NULL,outputTokens INTEGER NOT NULL,estimatedUsd REAL NOT NULL,credits REAL NOT NULL,status TEXT NOT NULL,createdAt TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS jobs(id TEXT PRIMARY KEY,clientId TEXT NOT NULL REFERENCES clients(id),type TEXT NOT NULL,payload TEXT NOT NULL,status TEXT NOT NULL,progress TEXT NOT NULL,error TEXT,createdAt TEXT NOT NULL,updatedAt TEXT NOT NULL,result TEXT);
CREATE UNIQUE INDEX IF NOT EXISTS active_job_per_client ON jobs(clientId) WHERE status IN ('queued','running');
CREATE TABLE IF NOT EXISTS review_links(tokenHash TEXT PRIMARY KEY,clientId TEXT NOT NULL,contentId TEXT NOT NULL,contentHash TEXT NOT NULL,expiresAt TEXT NOT NULL,used INTEGER NOT NULL DEFAULT 0,FOREIGN KEY(clientId,contentId) REFERENCES content(clientId,id));
CREATE TABLE IF NOT EXISTS metadata(key TEXT PRIMARY KEY,value TEXT NOT NULL);
CREATE INDEX IF NOT EXISTS content_client ON content(clientId,createdAt);
CREATE INDEX IF NOT EXISTS signals_client ON signals(clientId,fetchedAt);
CREATE INDEX IF NOT EXISTS usage_client ON usage(clientId,createdAt);
`);
