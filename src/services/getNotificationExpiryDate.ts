 const getNotificationExpiryDate = (days = 30) => new Date(Date.now() + days * 24 * 60 * 60 * 1000);

 export default getNotificationExpiryDate;