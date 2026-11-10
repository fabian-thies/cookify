<div style="text-align: center;">

# Cookify - Your Personal Recipe App

**Discover, save, and organize all your favorite recipes in one place.**
Upload photos, rate dishes, build collections, and find inspiration in your own digital cookbook.

</div>

## Features

- **User Accounts**
    - Create your own account with login, registration, and profile settings.
    - Choose your preferred language and update your avatar.
- **Recipe Management**
    - Add, edit, and delete recipes with full detail: ingredients (amounts + units), steps, servings, cook time, difficulty, tags, and tips.
    - Upload custom images to personalize each recipe.
    - Set recipes as **public** or **private** to control who can see them.
- **Import from URL (Recipe Scraper)**
    - Paste a recipe URL and let Cookify extract title, ingredients, steps, and image automatically via JSON-LD structured data.
    - If a page has no structured data, a configured AI model extracts the recipe as a fallback.
- **AI Recipes (optional)**
    - Create recipes from a text idea or a photo (cookbook page, handwritten note, finished dish, or fridge contents).
    - Edit existing recipes with natural language (e.g. "make it vegan" or "for 8 servings").
    - AI-generated recipes include estimated nutrition per serving; nutrition can also be estimated for existing recipes.
    - Admins can enable or disable AI features globally at any time.
- **Smart Search & Filters**
    - Search and filter recipes by difficulty, cook time, or keywords.
- **Favorites & Ratings**
    - Mark recipes as favorites and rate them on a 1–5 scale.
- **Personal Collections**
    - Group recipes into custom collections for easy organization.
- **Weekly Meal Plan**
    - Drag and drop recipes onto a weekly calendar to plan your meals.
    - Auto-generated **shopping list** based on the recipes scheduled for the week.
- **Cook Mode**
    - Full-screen, step-by-step cooking experience that keeps your screen awake.
    - Built-in **multiple timers** — start a timer per step or add custom timers on the fly.
- **Recipe Sharing**
    - Generate shareable links for any public recipe.
    - Track view counts to see how often your recipes have been viewed.
- **Home Dashboard**
    - Browse popular recipes, recently added dishes, and discover something new through curated carousels.
- **Administration & Backup**
    - Admin panel to manage users and toggle new registrations on/off.
    - **Backup & Restore**: export the entire database plus all uploaded images as a ZIP file, or import a backup to restore everything.
- **Multilingual Support**
    - Available in **English**, **German**, and **Spanish**.

## Installation

### Using Docker

1. Create a `.env` file for Docker Compose, for example:

    ```dotenv
    # App
    NODE_ENV=production
    ORIGIN=http://localhost:3000
    DATABASE_URL=postgres://cookify:secret@db:5432/cookify

    # Postgres DB
    POSTGRES_USER=cookify
    POSTGRES_PASSWORD=secret
    POSTGRES_DB=cookify
    ```

2. Start the containers:

    ```bash
    docker compose up -d --build
    ```

### Configuration Notes

* The **app container** exposes port **3000**.
  To access it from your host, add a port mapping under `app` in your `docker-compose.yml`:

  ```yaml
  services:
    app:
      ports:
        - "3000:3000"
  ```

* File uploads are persisted in the `./uploads` directory (mounted into the container).

* **AI configuration (optional):**
  The AI features use an OpenAI-compatible chat completions endpoint and are disabled when no key is set.
  Add these variables to your `.env` / Coolify environment:

  ```dotenv
  OPENAI_KEY=your_api_key
  OPENAI_BASE_URL=https://ollama.com/v1   # Ollama Cloud; use https://api.openai.com/v1 for OpenAI
  OPENAI_MODEL=deepseek-v4.1-flash:1017          # text model
  OPENAI_VISION_MODEL=deepseek-v4.1-flash:1017   # used for image input
  ```

  After deploying, an administrator can turn the features on or off under **Administration → AI**.
  Recipe text and photos are sent to the configured provider; review its privacy policy before enabling AI.

* Database **migrations** run automatically on container start (`scripts/migrate.ts`).

* **Coolify Deployment:**
  The provided `docker-compose.yml` works out of the box with **Coolify**. Just make sure your domain in Coolify is forwarded to the app’s exposed port (`3000`).