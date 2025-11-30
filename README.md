
  # Simple Todo App

  This is a code bundle for Simple Todo App. The original project is available at https://www.figma.com/design/PD6MkmTYskww1TB4X2wCvC/Simple-Todo-App.

  ## Setup

  ### 1. Install Dependencies

  Run `npm i` to install the dependencies.

  ### 2. Set up Supabase

  1. Create a new project at [Supabase](https://supabase.com)
  2. Go to your project settings and copy your project URL and anon key
  3. Create a `.env` file in the root directory (copy from `.env.example`):
     ```
     VITE_SUPABASE_URL=your_supabase_project_url
     VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
     ```
  4. In your Supabase project, go to the SQL Editor and run the SQL from `supabase-schema.sql` to create the necessary tables

  ### 3. Run the Development Server

  Run `npm run dev` to start the development server.

  ## Database Schema

  The app uses two main tables:
  - `lists`: Stores todo lists with name, color, and sharing settings
  - `todos`: Stores tasks with text, completion status, deadlines, and list associations

  See `supabase-schema.sql` for the complete schema definition.
  