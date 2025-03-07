import express from "express";
import { createClient } from "@supabase/supabase-js"; 
import dotenv from "dotenv";
import path from "path"; 

const __dirname = path.resolve();
dotenv.config({ path: path.join(__dirname, '.env') });

const app = express();

// Add middleware to parse JSON bodies
app.use(express.json());

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY
);

// Student Login - simplified without token
app.post("/login", async (req, res) => {
  try {
    const { semail, spassword } = req.body;
    
    // Validate input
    if (!semail || !spassword) {
      return res.status(400).json({ error: "Email and password are required" });
    }
    
    // Check student credentials
    const { data: student, error } = await supabase
      .from('student_management')
      .select('*')
      .eq('semail', semail)
      .eq('spassword', spassword)
      .single();

    if (error || !student) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    // Return success message with student info
    res.json({ 
      message: "Login successful",
      student: {
        id: student.id,
        name: student.sname,
        email: student.semail
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// STUDENT MANAGEMENT ENDPOINTS

// Create student record
app.post("/register", async (req, res) => {
  try {
    const { sname, semail, spassword } = req.body;
    
    // Validate input
    if (!sname || !semail || !spassword) {
      return res.status(400).json({ error: "Name, email and password are required" });
    }
    
    // Check if student already exists
    const { data: existingStudent, error: checkError } = await supabase
      .from('student_management')
      .select('*')
      .eq('semail', semail)
      .single();

    if (existingStudent) {
      return res.status(400).json({ error: "Student already exists with this email" });
    }

    // Store student details
    const { data, error } = await supabase
      .from('student_management')
      .insert([{
        sname,
        semail,
        spassword
      }])
      .select()
      .single();

    if (error) throw error;

    res.status(201).json({ message: "Student added successfully", student: data });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Search student by ID
app.get("/students/search/:id", async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!id) {
      return res.status(400).json({ error: "Student ID is required" });
    }

    const { data, error } = await supabase
      .from('student_management')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      return res.status(404).json({ error: "Student not found" });
    }

    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update student - with email/password verification
app.put("/students/update/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { sname, semail, spassword, currentEmail, currentPassword } = req.body;
    
    // Require current credentials to verify identity
    if (!currentEmail || !currentPassword) {
      return res.status(400).json({ error: "Current email and password are required for authentication" });
    }

    // Verify student credentials
    const { data: student, error: authError } = await supabase
      .from('student_management')
      .select('*')
      .eq('id', id)
      .eq('semail', currentEmail)
      .eq('spassword', currentPassword)
      .single();

    if (authError || !student) {
      return res.status(403).json({ error: "Authentication failed. Please provide correct credentials." });
    }
    
    // Create update object with only provided fields
    const updateData = {};
    if (sname) updateData.sname = sname;
    if (semail) updateData.semail = semail;
    if (spassword) updateData.spassword = spassword;

    const { data, error } = await supabase
      .from('student_management')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    if (!data) {
      return res.status(404).json({ error: "Student not found" });
    }
    res.json({ message: "Student updated successfully", student: data });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete student - with email/password verification
app.delete("/students/delete/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { currentEmail, currentPassword } = req.body;
    
    // Require current credentials to verify identity
    if (!currentEmail || !currentPassword) {
      return res.status(400).json({ error: "Current email and password are required for authentication" });
    }

    // Verify student credentials
    const { data: student, error: authError } = await supabase
      .from('student_management')
      .select('*')
      .eq('id', id)
      .eq('semail', currentEmail)
      .eq('spassword', currentPassword)
      .single();

    if (authError || !student) {
      return res.status(403).json({ error: "Authentication failed. Please provide correct credentials." });
    }
    
    const { error: deleteError } = await supabase
      .from('student_management')
      .delete()
      .eq('id', id);

    if (deleteError) throw deleteError;
    
    res.json({ message: "Student deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(6001, () => {
  console.log("Server is running on port 6001");
});
