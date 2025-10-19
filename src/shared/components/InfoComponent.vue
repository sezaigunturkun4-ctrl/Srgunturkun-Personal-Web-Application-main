<template>
  <div class="info-component-root">
    <div class="content-wrapper">
      <!-- Background Video -->
      <video autoplay muted loop playsinline class="background-video">
        <source src="../assets/WebsiteBackgroundVideo.mp4" type="video/mp4" />
        Your browser does not support the video tag.
      </video>

      <!-- Main Content Section -->
      <div class="main-content">
        <div class="intro-section">
          <img alt="Srgunturkun logo" src="../assets/New Project.png" class="logo">
          <h2 class="headline">As versatile, as professional, as exists...</h2>
          <div class="intro-text">
            <p>Sezai Recep Güntürkün a.k.a "Tradeking", is a computer
            engineer who always prefers to combine his work, hobbies and skills.
            In present, it is undoubtful that every professionality
            is intricated. Even though, some may see that as a "headache";
            I strongly disagree with them by saying "This is an opportunity for expanding our vision."</p>
            <h4>As a result, I will prove given thesis through my work.
            I hope, I may reach to the pleasure of earning your upholding support during my journey &#128151;</h4>
          </div>
        </div>
      </div>
    </div>
    <!-- Social Info Section -->
    <div class="social-section">
      <div class="social-content">
        <div class="social-overlay"></div>
        <h2>Visit My Social</h2>
        <p>Explore and interact with our gaming world.</p>
        <router-link to="/social" class="social-button">
          Visit our Social Media!
        </router-link>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'InfoComponent'
}
</script>

<style scoped>
/* Root wrapper for transition compatibility */
.info-component-root {
  width: 100%;
}

.content-wrapper {
  min-height: 100vh;
  position: relative;
  overflow-x: hidden;
  
}

.content-wrapper::before {
  content: "";
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  width: 100%;
  height: 100%;
  background: url('../../shared/assets/InfoTextFrame.png') no-repeat;
  background-size: 70% 130%;
  background-position: center;
  opacity: 0.15;
  z-index: -1;
  pointer-events: none;
}

.background-video {
  position: fixed;
  top: 0;
  left: 0;
  min-width: 50vw;
  min-height: 50vh;
  width: 100vw;
  height: 100vh;
  object-fit: cover;
  z-index: 0;
  opacity: 0.15;
  pointer-events: none;
}

.social-section {
  position: relative;
  width: 100vw;
  min-height: 50vh;
  display: flex;
  justify-content: center;
  align-items: center;
  overflow: hidden;
}

.social-content {
  padding: 2rem;
  text-align: center;
  color: white;
  z-index: 1;
}

.social-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: url('../../shared/assets/InfoSocialBackground.png') center/cover no-repeat;
  opacity: 0.7;
  z-index: -1;
  filter: brightness(0.7);
}

.main-content {
  position: relative;
  z-index: 1;
}

.intro-section {
  text-align: center;
  margin: 7rem 0;
}

.logo {
  width: 1vw;
  min-width: 330px;
  opacity: 0.4;
  margin-bottom: 2rem;
}

.headline {
  font-size: 2.5rem;
  color: #333;
  margin-bottom: 2rem;
}

.intro-text {
  max-width: 800px;
  margin: 0 auto;
  line-height: 1.6;
}

.intro-text p {
  margin: 7rem 0;
  font-size: 1.1rem;
}

.intro-text h4 {
  margin: 3rem 0;
}
.social-section {
  top: 0;
  left: 0;
  background: rgba(255, 255, 255, 0.9);
  border-radius: 16px;
  box-shadow: 0 4px 30px rgba(0, 0, 0, 0.1);
  backdrop-filter: blur(5px);
  -webkit-backdrop-filter: blur(5px);
  border: 1px solid rgba(255, 255, 255, 0.3);
}

.social-content {
  text-align: center;
}

.social-content h2 {
  color: #dd7724;
  font-size: 2rem;
  margin-bottom: 1.5rem;
}

.social-content p {
  color: rgba(255, 255, 255, 0.9);
  font-size: 1.1rem;
  line-height: 1.6;
  margin-bottom: 2rem;
}

.social-features {
  display: flex;
  justify-content: center;
  gap: 3rem;
  margin: 2rem 0;
}

.feature {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
}

.feature .icon {
  font-size: 2rem;
}

.feature .text {
  color: #666;
  font-size: 1rem;
}

.social-button {
  display: inline-block;
  padding: 1rem 2.5rem;
  font-size: 1.1rem;
  color: white;
  background: #dd7724;
  border-radius: 30px;
  text-decoration: none;
  transition: all 0.3s ease;
  margin-top: 2rem;
}

.social-section h2 {
  font-size: 2.5rem;
  margin-bottom: 1.5rem;
  text-shadow: 2px 2px 4px rgba(0,0,0,0.3);
}

.social-section p {
  font-size: 1.2rem;
  margin-bottom: 2rem;
  text-shadow: 1px 1px 2px rgba(0,0,0,0.3);
}

.social-button {
  display: inline-block;
  padding: 1rem 2.5rem;
  font-size: 1.1rem;
  color: white;
  background: rgba(221, 119, 36, 0.9);
  border-radius: 30px;
  text-decoration: none;
  transition: all 0.3s ease;
  border: 2px solid rgba(255,255,255,0.2);
}

.social-button:hover {
  background: rgba(194, 102, 32, 0.95);
  transform: translateY(-2px);
  box-shadow: 0 4px 15px rgba(0,0,0,0.2);
  border-color: rgba(255,255,255,0.4);
}
</style>