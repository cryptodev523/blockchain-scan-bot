export const formatPercent = (value?: number, originalValue?: number) => {
  const percentage = (value ?? 0) * 100;
  const formattedPercentage = percentage.toFixed(2);

  if (formattedPercentage === "0.00") {
    if (originalValue && originalValue > 0) return `${originalValue}`;
    else return "0%";
  }

  if (formattedPercentage.endsWith(".00")) {
    return `${percentage.toFixed(0)}%`;
  } else {
    return `${formattedPercentage}%`;
  }
};

export const formatTimeAgo = (dateString: string) => {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime(); // difference in milliseconds

  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const diffHours = Math.floor(
    (diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)
  );
  const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

  return `${diffDays} days, ${diffHours}h, ${diffMinutes}min ago`;
};

export const formatTimeUntil = (dateString: string) => {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = date.getTime() - now.getTime(); // difference in milliseconds

  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const diffHours = Math.floor(
    (diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)
  );
  const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

  return `${diffDays} days ${diffHours} hours`;
};

export const shortenAddress = (address: string) => {
  return address.slice(0, 4) + "..." + address.slice(-3);
};

export const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  const options = {
    day: "numeric" as const,
    month: "short" as const,
    year: "numeric" as const,
    hour: "2-digit" as const,
    minute: "2-digit" as const,
    second: "2-digit" as const,
    timeZoneName: "short" as const,
  };
  return date.toLocaleDateString("en-US", options);
};

export const decodeTimeStamp = (timestamp: number) => {
  const date = new Date(timestamp * 1000);
  return date.toUTCString();
};

export const formatUTCDate = (dateString: string) => {
  const date = new Date(dateString);
  const day = date.getUTCDate().toString().padStart(2, "0");
  const monthIndex = date.getUTCMonth();
  const year = date.getUTCFullYear();
  const hour = date.getUTCHours().toString().padStart(2, "0");
  const minute = date.getUTCMinutes().toString().padStart(2, "0");
  const second = date.getUTCSeconds().toString().padStart(2, "0");

  const monthNames = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];
  const month = monthNames[monthIndex];

  return `${day} ${month} ${year} ${hour}:${minute}:${second} UTC`;
};
