import { Router, Request, Response } from 'express';
import { db, UserRow, StudentRow } from '../db.js';
import { postgresAdapter } from '../postgresAdapter.js';
import { postgresService } from '../postgresService.js';
import { hashPassword, verifyPassword, generateToken, authenticateToken, AuthRequest } from '../auth.js';

const router = Router();

// POST /api/auth/login
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    const cleanEmail = email.trim().toLowerCase();
    let user: UserRow | null = null;
    let student: StudentRow | null = null;

    if (postgresAdapter.isConnected) {
      user = await postgresService.findUserByEmail(cleanEmail);
      if (!user) {
        return res.status(401).json({ error: 'Invalid email or password credentials.' });
      }

      let isValid = false;
      try {
        isValid = await verifyPassword(password, user.password_hash);
      } catch (e) {
        isValid = false;
      }
      if (!isValid && user.password_hash === password) {
        // Support pre-populated plain passwords in test databases
        isValid = true;
      }
      if (!isValid) {
        return res.status(401).json({ error: 'Invalid email or password credentials.' });
      }

      if (user.role === 'STUDENT') {
        student = await postgresService.findStudentByUserId(user.user_id);
        if (!student) {
          student = await postgresService.createStudent(
            user.user_id,
            user.name,
            user.email,
            `CS${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`
          );
        }
      }
    } else {
      user = db.users.find(u => u.email.toLowerCase() === cleanEmail) || null;
      if (!user) {
        return res.status(401).json({ error: 'Invalid email or password credentials.' });
      }

      let isValid = false;
      try {
        isValid = await verifyPassword(password, user.password_hash);
      } catch (e) {
        isValid = false;
      }
      if (!isValid && user.password_hash === password) {
        isValid = true;
      }
      if (!isValid) {
        return res.status(401).json({ error: 'Invalid email or password credentials.' });
      }

      if (user.role === 'STUDENT') {
        student = db.students.find(s => s.user_id === user!.user_id) || null;
        if (!student) {
          student = {
            student_id: db.nextId('student'),
            user_id: user.user_id,
            name: user.name,
            email: user.email,
            roll_no: `CS${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`,
            created_at: new Date().toISOString()
          };
          db.students.push(student);
          await db.save();
        }
      }
    }

    const token = generateToken(user, student);

    return res.json({
      message: 'Login successful',
      token,
      user: {
        user_id: user.user_id,
        name: user.name,
        email: user.email,
        role: user.role
      },
      student
    });
  } catch (err: any) {
    console.error('Login error:', err);
    return res.status(500).json({ error: 'Internal server error during login.' });
  }
});

// POST /api/auth/register (Student or Teacher)
router.post('/register', async (req: Request, res: Response) => {
  try {
    const { name, email, password, role = 'STUDENT', roll_no } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email, and password are required.' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters long.' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const selectedRole = role === 'TEACHER' ? 'TEACHER' : 'STUDENT';
    const passwordHash = await hashPassword(password);

    let newUser: UserRow;
    let newStudent: StudentRow | null = null;

    if (postgresAdapter.isConnected) {
      const existingUser = await postgresService.findUserByEmail(cleanEmail);
      if (existingUser) {
        return res.status(409).json({ error: 'An account with this email address already exists.' });
      }

      newUser = await postgresService.createUser(name.trim(), cleanEmail, passwordHash, selectedRole);

      if (selectedRole === 'STUDENT') {
        const generatedRoll = roll_no && roll_no.trim()
          ? roll_no.trim().toUpperCase()
          : `CS${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`;

        newStudent = await postgresService.createStudent(newUser.user_id, newUser.name, newUser.email, generatedRoll);
      }
    } else {
      const existingUser = db.users.find(u => u.email.toLowerCase() === cleanEmail);
      if (existingUser) {
        return res.status(409).json({ error: 'An account with this email address already exists.' });
      }

      const now = new Date().toISOString();
      newUser = {
        user_id: db.nextId('users'),
        name: name.trim(),
        email: cleanEmail,
        password_hash: passwordHash,
        role: selectedRole,
        created_at: now
      };

      db.users.push(newUser);

      if (selectedRole === 'STUDENT') {
        const generatedRoll = roll_no && roll_no.trim()
          ? roll_no.trim().toUpperCase()
          : `CS${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`;

        const existingRoll = db.students.find(s => s.roll_no === generatedRoll);
        const finalRoll = existingRoll ? `${generatedRoll}-${Math.floor(10 + Math.random() * 90)}` : generatedRoll;

        newStudent = {
          student_id: db.nextId('student'),
          user_id: newUser.user_id,
          name: newUser.name,
          email: newUser.email,
          roll_no: finalRoll,
          created_at: now
        };
        db.students.push(newStudent);
      }

      await db.save();
    }

    const token = generateToken(newUser, newStudent);

    return res.status(201).json({
      message: 'Account registered successfully',
      token,
      user: {
        user_id: newUser.user_id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role
      },
      student: newStudent
    });
  } catch (err: any) {
    console.error('Registration error:', err);
    return res.status(500).json({ error: 'Internal server error during registration.' });
  }
});

// GET /api/auth/me
router.get('/me', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    let user: UserRow | null = null;
    let student: StudentRow | null = null;

    if (postgresAdapter.isConnected) {
      user = await postgresService.findUserById(req.user.user_id);
      if (!user) {
        return res.status(404).json({ error: 'User not found.' });
      }
      if (user.role === 'STUDENT') {
        student = await postgresService.findStudentByUserId(user.user_id);
      }
    } else {
      user = db.users.find(u => u.user_id === req.user!.user_id) || null;
      if (!user) {
        return res.status(404).json({ error: 'User not found.' });
      }
      if (user.role === 'STUDENT') {
        student = db.students.find(s => s.user_id === user!.user_id) || null;
      }
    }

    return res.json({
      user: {
        user_id: user.user_id,
        name: user.name,
        email: user.email,
        role: user.role
      },
      student
    });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to fetch current user profile.' });
  }
});

// POST /api/auth/forgot-password
router.post('/forgot-password', async (req: Request, res: Response) => {
  try {
    const { email, new_password } = req.body;
    if (!email) {
      return res.status(400).json({ error: 'Email is required.' });
    }

    if (postgresAdapter.isConnected) {
      const user = await postgresService.findUserByEmail(email);
      if (!user) {
        return res.status(404).json({ error: 'No account registered with this email address.' });
      }
      if (new_password) {
        if (new_password.length < 6) {
          return res.status(400).json({ error: 'New password must be at least 6 characters.' });
        }
        const hash = await hashPassword(new_password);
        await postgresService.updateUserPassword(user.user_id, hash);
        return res.json({ message: 'Password has been successfully reset! You can now log in.' });
      }
      return res.json({
        message: 'Password reset link simulated. For instant testing, you may provide a new password directly.',
        email: user.email
      });
    }

    const user = db.users.find(u => u.email.toLowerCase() === email.trim().toLowerCase());
    if (!user) {
      return res.status(404).json({ error: 'No account registered with this email address.' });
    }

    if (new_password) {
      if (new_password.length < 6) {
        return res.status(400).json({ error: 'New password must be at least 6 characters.' });
      }
      user.password_hash = await hashPassword(new_password);
      await db.save();
      return res.json({ message: 'Password has been successfully reset! You can now log in.' });
    }

    return res.json({
      message: 'Password reset link simulated. For instant testing, you may provide a new password directly.',
      email: user.email
    });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to process password reset.' });
  }
});

export default router;

