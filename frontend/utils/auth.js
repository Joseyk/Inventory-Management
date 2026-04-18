export const getSecureRole = () => {
  const token = localStorage.getItem("token");

  if (!token) {
    return null;
  }

  const parts = token.split(".");
  if (parts.length !== 3) {
    return null;
  }

  try {
    const payload = JSON.parse(atob(token.split(".")[1]));

    const role = payload.role || payload.userRole || payload.Role;
    const currentTime = Math.floor(Date.now() / 1000);

    if (payload.exp && payload.exp < currentTime) {
      console.warn("Auth Check: Token has expired!");
      localStorage.clear();
      return null;
    }

    if (!role) {
      console.warn(
        "Auth Check: Token is valid but no 'role' field was found inside it.",
      );
      return null;
    }

    return payload.role || null;
  } catch (e) {
    return null;
  }
};
export const hasPermission = (allowedRoles) => {
  const role = getSecureRole();
  if (!role) return false;
  return allowedRoles.includes(role);
};
