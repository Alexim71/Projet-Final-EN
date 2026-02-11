
import { StyleSheet } from 'react-native';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0A2540",
    alignItems: "center",
  },

  title: {
    marginTop: 80,
    fontSize: 34,
    fontWeight: "bold",
    color: "#FFFFFF",
    letterSpacing: 2,
  },

  logo: {
    position: "absolute",
    bottom: 160,
    width: 120,
    height: 120,
    resizeMode: "contain",
  },

  permissionBox: {
    position: "absolute",
    width: "90%",
    alignSelf: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 20,
    elevation: 10,
  },

  permissionTitle: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 10,
    textAlign: "center",
  },

  permissionText: {
    fontSize: 15,
    textAlign: "center",
    color: "#555",
    marginBottom: 20,
  },

  button: {
    backgroundColor: "#0A2540",
    paddingVertical: 12,
    borderRadius: 12,
  },

  buttonText: {
    color: "#FFF",
    fontSize: 16,
    textAlign: "center",
    fontWeight: "bold",
  },

  loaderOverlay: {
  position: "absolute",
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  backgroundColor: "rgba(0,0,0,0.6)",
  justifyContent: "center",
  alignItems: "center",
  zIndex: 10,
},

loaderText: {
  marginTop: 15,
  color: "#fff",
  fontSize: 16,
},

  lottie: {
    width: 220,
    height: 220,
  },
    loadingText: {
    marginTop: 20,
    color: "#fff",
    fontSize: 16,
  },

});

export default styles;