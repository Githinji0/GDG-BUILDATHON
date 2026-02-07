import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';

export class DB {
    private db: Database.Database;

    constructor(dbPath: string = 'university.db') {
        this.db = new Database(dbPath);
        this.initializeSchema();
    }

    private initializeSchema() {
        const schemaPath = path.join(__dirname, 'schema.sql');
        const schema = fs.readFileSync(schemaPath, 'utf-8');
        this.db.exec(schema);
    }

    public get instance(): Database.Database {
        return this.db;
    }
}
