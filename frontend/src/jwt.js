export function decodeToken(token) {
  try {
    const payload = token.split(".")[1];
    const decoded = JSON.parse(atob(payload));
    return decoded; // { sub: email, role: "researcher", exp: ... }
  } catch {
    return null;
  }
}