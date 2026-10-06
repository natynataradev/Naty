export function formatMessageTime(iso: string): string {
  const date = new Date(iso);
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  return `${hours}:${minutes}`;
}

export function getInitials(name: string): string {
  return name.slice(0, 2).toUpperCase();
}
