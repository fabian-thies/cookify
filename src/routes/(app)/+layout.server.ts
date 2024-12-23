export async function load({locals}) {
    const {user} = locals;

    if (user) {
        const {id, email, username} = user;

        return {
            user: {id, email, username},
        };
    }

    return {user: null};
}