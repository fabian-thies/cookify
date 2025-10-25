<div style="text-align: center;">

# Cookify - Your Personal Recipe App

**Discover, save, and organize all your favorite recipes in one place.**
Upload photos, rate dishes, build collections, and find inspiration in your own digital cookbook.

</div>

---

## Features

- **User Accounts**
    - Create your own account with login and registration.
- **Recipe Management**
    - Add, edit, and delete your favorite recipes.
    - Include ingredients (with amounts and units), steps, servings, and cook time.
    - Upload images to personalize your recipes.
- **Smart Search & Filters**
    - Easily search and filter recipes (e.g., by difficulty or cook time).
- **Favorites & Ratings**
    - Mark favorites and rate recipes you love.
- **Personal Collections**
    - Organize everything with custom recipe collections.
- **Multilingual Support**
    - Use Cookify in your preferred language: **English**, **German**, or **Spanish**.

---

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

---

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

* Database **migrations** run automatically on container start (`scripts/migrate.ts`).

* **Coolify Deployment:**
  The provided `docker-compose.yml` works out of the box with **Coolify**. Just make sure your domain in Coolify is forwarded to the app’s exposed port (`3000`).

<div style="text-align: center; margin-top: 3rem;">
    Made with ❤️ and Svelte.
</div>