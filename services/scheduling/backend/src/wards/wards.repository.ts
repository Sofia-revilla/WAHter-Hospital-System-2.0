import { Injectable } from "@nestjs/common";
import { Database } from "@wahter/shared";

export interface WardRow {
  id: string;
  name: string;
  type: string;
  capacity: number;
  census_occupied: number;
  color: string;
}

@Injectable()
export class WardsRepository {
  constructor(private readonly database: Database) {}

  findAll() {
    return this.database.query<WardRow>("SELECT * FROM wards ORDER BY id");
  }

  findById(id: string) {
    return this.database.one<WardRow>("SELECT * FROM wards WHERE id = $1", [id]);
  }
}
