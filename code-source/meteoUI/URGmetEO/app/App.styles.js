
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
});

export default styles;