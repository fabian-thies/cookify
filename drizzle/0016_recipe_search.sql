ALTER TABLE "recipes" ADD COLUMN "search_vector" "tsvector";

-- Trigram matching is used as a fallback for typos ("pancaks" -> "pancakes").
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE OR REPLACE FUNCTION cookify_search_vector(recipe_title text, recipe_description text, recipe_tags text)
    RETURNS tsvector
    LANGUAGE sql
    IMMUTABLE
AS $$
SELECT setweight(to_tsvector('simple', coalesce(recipe_title, '')), 'A') ||
       setweight(to_tsvector('simple', coalesce(recipe_description, '')), 'B') ||
       setweight(to_tsvector('simple', coalesce(recipe_tags, '')), 'C')
$$;

CREATE OR REPLACE FUNCTION recipes_search_vector_trigger()
    RETURNS trigger
    LANGUAGE plpgsql
AS $$
BEGIN
    NEW.search_vector := cookify_search_vector(
        NEW.title,
        NEW.description,
        (SELECT string_agg(t.name, ' ') FROM tags t WHERE t.recipe_id = NEW.id)
    );
    RETURN NEW;
END
$$;

CREATE TRIGGER recipes_search_vector_trigger
    BEFORE INSERT OR UPDATE OF title, description ON recipes
    FOR EACH ROW
EXECUTE FUNCTION recipes_search_vector_trigger();

CREATE OR REPLACE FUNCTION tags_search_vector_trigger()
    RETURNS trigger
    LANGUAGE plpgsql
AS $$
DECLARE
    target_recipe_id integer := COALESCE(NEW.recipe_id, OLD.recipe_id);
BEGIN
    UPDATE recipes r
    SET search_vector = cookify_search_vector(
        r.title,
        r.description,
        (SELECT string_agg(t.name, ' ') FROM tags t WHERE t.recipe_id = r.id)
    )
    WHERE r.id = target_recipe_id;
    RETURN NULL;
END
$$;

CREATE TRIGGER tags_search_vector_trigger
    AFTER INSERT OR UPDATE OF name, recipe_id OR DELETE ON tags
    FOR EACH ROW
EXECUTE FUNCTION tags_search_vector_trigger();

-- Backfill existing rows after the triggers exist so tag changes stay in sync.
UPDATE recipes r
SET search_vector = cookify_search_vector(
    r.title,
    r.description,
    (SELECT string_agg(t.name, ' ') FROM tags t WHERE t.recipe_id = r.id)
);
