export interface Migration {
  from: string;
  to: string;
  description: string;
}

export const migrations: Migration[] = [];
