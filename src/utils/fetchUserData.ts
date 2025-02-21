export async function fetchUserData(username: string) {
  try {
    const response = await fetch(`/api/fetch-data/${username}`);
    const resData = await response.json();
    if (response.ok && resData.success) {
      localStorage.setItem("userData", JSON.stringify(resData.data));
      return resData.data;
    } else {
      throw new Error(resData.error || "Failed to fetch user data");
    }
  } catch (error) {
    console.error(error);
    throw error;
  }
}