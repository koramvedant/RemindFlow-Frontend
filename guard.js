const token = localStorage.getItem('accessToken');

if (!token) {
  window.location.replace('/login.html');
}
