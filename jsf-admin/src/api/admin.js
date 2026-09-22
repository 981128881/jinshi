export { adminLogin, adminRefresh, adminLogout } from './modules/auth.js'
export { fetchDashboard } from './modules/dashboard.js'
export {
  fetchAdminProfile,
  fetchPermissionTree,
  fetchAdminUsers,
  createAdminUser,
  updateAdminUser,
  deleteAdminUser
} from './modules/adminAccount.js'
export {
  fetchRestaurants,
  fetchRestaurant,
  createRestaurant,
  updateRestaurant,
  updateRestaurantOpen,
  updateRestaurantStatus,
  fetchRestaurantCategories,
  createRestaurantCategory,
  updateRestaurantCategory,
  deleteRestaurantCategory,
  fetchRestaurantDishes,
  createRestaurantDish,
  updateRestaurantDish,
  deleteRestaurantDish,
  fetchRestaurantWxaCode,
  updateRestaurantPassword,
  uploadDishImage,
  uploadShopImage
} from './modules/restaurant.js'
export {
  fetchCuisineTypes,
  createCuisineType,
  updateCuisineType,
  deleteCuisineType
} from './modules/cuisineType.js'
export {
  fetchReservations,
  fetchReservationDetail,
  updateReservationStatus
} from './modules/reservation.js'
export { fetchBanners, createBanner, updateBanner, deleteBanner, uploadBannerImage } from './modules/banner.js'
export { fetchShopConfig, updateShopConfig } from './modules/setting.js'
export { fetchUsers } from './modules/user.js'
