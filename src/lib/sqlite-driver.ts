import * as SQLite from 'expo-sqlite';

export function openDatabase(name: string): Promise<SQLite.SQLiteDatabase> {
  return SQLite.openDatabaseAsync(name);
}
