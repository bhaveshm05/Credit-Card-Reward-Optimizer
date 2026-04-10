export const parseExpiryDate = (expiryStr: string): Date | null => {
    if (!expiryStr || expiryStr.toUpperCase() === "N/A") return null;

    try {
        const [month, year] = expiryStr.split("/").map((num) => parseInt(num, 10));
        if (!month || !year) return null;

        // Create date related to expiry
        // Expiry is usually end of the month, but let's just pick the 1st for comparison to be safe, 
        // or actually usually cards expire at the END of that month.
        // Let's set it to the last day of that month.
        const date = new Date(year, month, 0); // Day 0 of next month is last day of current month
        return date;
    } catch (e) {
        return null;
    }
};

export const isExpiringSoon = (expiryStr: string, daysThreshold = 30): boolean => {
    const expiryDate = parseExpiryDate(expiryStr);
    if (!expiryDate) return false;

    const today = new Date();
    const diffTime = expiryDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    return diffDays <= daysThreshold && diffDays >= 0;
};
