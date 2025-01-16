import { User } from "@prisma/client";
import "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      username: string;
      name: string | null;
      role: string;
    };
  }

  interface User extends Omit<User, "password"> {
    id: string;
    username: string;
    name: string | null;
    role: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    username: string;
    name: string | null;
    role: string;
  }
} 