import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { Request, Response, NextFunction } from 'express';
import { db, UserRow, StudentRow } from './db.js';
import { supabaseAdmin } from './supabaseClient.js';

const JWT_SECRET = process.env.JWT_SECRET || 'nexusexam_jwt_secret_key_2026_super_secure';

export interface AuthRequest extends Request {
  user?: {
    user_id: number;
    email: string;
    name: string;
    role: 'TEACHER' | 'STUDENT' | 'ADMIN';
    student_id?: number;
    roll_no?: string;
  };
}

export function generateToken(user: UserRow, student?: StudentRow | null): string {
  const payload = {
    user_id: user.user_id,
    email: user.email,
    name: user.name,
    role: user.role,
    student_id: student?.student_id,
    roll_no: student?.roll_no
  };

  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
}

export async function hashPassword(password: string): Promise<string> {
  return await bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return await bcrypt.compare(password, hash);
}

export async function authenticateToken(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;

  if (!token) {
    res.status(401).json({ error: 'Authentication required. Please log in.' });
    return;
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    req.user = decoded;
    return next();
  } catch (err) {
    // If not standard JWT, check if it is a Supabase access token
    try {
      const { data: { user: sbUser }, error: sbErr } = await supabaseAdmin.auth.getUser(token);
      if (sbUser && !sbErr && sbUser.email) {
        const cleanEmail = sbUser.email.toLowerCase();
        const { data: userRow } = await supabaseAdmin
          .from('users')
          .select('*')
          .ilike('email', cleanEmail)
          .maybeSingle();

        if (userRow) {
          let studentId: number | undefined = undefined;
          let rollNo: string | undefined = undefined;

          if (userRow.role === 'STUDENT') {
            const { data: studentRow } = await supabaseAdmin
              .from('students')
              .select('student_id, roll_no')
              .eq('user_id', userRow.user_id)
              .maybeSingle();

            if (studentRow) {
              studentId = studentRow.student_id;
              rollNo = studentRow.roll_no;
            } else {
              const { data: studentByEmail } = await supabaseAdmin
                .from('students')
                .select('student_id, roll_no')
                .ilike('email', cleanEmail)
                .maybeSingle();

              if (studentByEmail) {
                studentId = studentByEmail.student_id;
                rollNo = studentByEmail.roll_no;
              }
            }
          }

          req.user = {
            user_id: userRow.user_id,
            student_id: studentId,
            roll_no: rollNo,
            email: userRow.email,
            name: userRow.name,
            role: userRow.role
          };
          return next();
        }
      }
    } catch (sbEx) {
      console.warn('[Auth Middleware] Supabase token validation check:', sbEx);
    }

    res.status(403).json({ error: 'Session expired or invalid token. Please log in again.' });
  }
}

export function requireRole(allowedRoles: Array<'TEACHER' | 'STUDENT' | 'ADMIN'>) {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required.' });
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({ error: `Access denied. Requires role: ${allowedRoles.join(' or ')}.` });
      return;
    }

    next();
  };
}
