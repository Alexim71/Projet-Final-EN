
import { StyleSheet } from 'react-native';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0A2540",
    alignItems: "center",
  },

  title: {
    marginTop: 80,
    fontSize: 20,
    fontWeight: "bold",
    color: "#ffffff",
    letterSpacing: 2,
  },

  logo: {
    position: "absolute",
    bottom: 500,
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






  // Dans votre App.styles.js
bottomSheetContainer: {
  position: 'absolute',
  left: 0,
  right: 0,
  bottom: 0,
  backgroundColor: 'white',
  borderTopLeftRadius: 24,
  borderTopRightRadius: 24,
  paddingHorizontal: 20,
  paddingTop: 12,
  paddingBottom: 30,
  shadowColor: '#000',
  shadowOffset: {
    width: 0,
    height: -2,
  },
  shadowOpacity: 0.1,
  shadowRadius: 8,
  elevation: 10,
  //maxHeight: '800%',
},

bottomSheetHeader: {
  alignItems: 'center',
  marginBottom: 20,
},


bottomSheetTitle: {
  fontSize: 14,
  fontWeight: '700',
  color: '#1A1A1A',
  marginBottom: 8,
  textAlign: 'center',
},

bottomSheetSubtitle: {
  fontSize: 10,
  color: '#666',
  textAlign: 'center',
  marginBottom: 24,
  lineHeight: 12,
},

featuresContainer: {
  marginBottom: 200,
},

featureItem: {
  flexDirection: 'row',
  alignItems: 'flex-start',
  marginBottom: 20,
  backgroundColor: '#F8F9FA',
  padding: 12,
  borderRadius: 12,
},

featureIcon: {
  width: 40,
  height: 40,
  borderRadius: 20,
  backgroundColor: '#E3F2FD',
  justifyContent: 'center',
  alignItems: 'center',
  marginRight: 12,
},

iconText: {
  fontSize: 20,
},

featureTextContainer: {
  flex: 1,
},

featureTitle: {
  fontSize: 13,
  fontWeight: '600',
  color: '#1A1A1A',
  marginBottom: 4,
},

featureDescription: {
  fontSize: 14,
  color: '#666',
  lineHeight: 18,
},

allowButton: {
  backgroundColor: '#007AFF',
  paddingVertical: 16,
  borderRadius: 14,
  alignItems: 'center',
  marginBottom: 12,
  shadowColor: '#007AFF',
  shadowOffset: {
    width: 0,
    height: 4,
  },
  shadowOpacity: 0.2,
  shadowRadius: 8,
  elevation: 4,
},






bottomSheetContainer: {
  position: "absolute",
  bottom: 0,
  width: "100%",
  backgroundColor: "#fff",
  borderTopLeftRadius: 20,
  borderTopRightRadius: 20,
  overflow: "hidden", // 👈 important
},

scrollContent: {
  flexGrow: 1,         // 👈 bonus sécurité
  paddingBottom: 60,
},
bottomSheetHeader: {
  alignItems: "center",
  paddingVertical: 10,
},

dragHandle: {
  width: 40,
  height: 5,
  borderRadius: 3,
  backgroundColor: "#ccc",
},

 buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between', // ou 'space-around' selon l'effet désiré
    alignItems: 'center',
    width: '100%',
    paddingHorizontal: 20,
    marginTop: 10, // ajustez selon vos besoins
  },
  
  allowButton: {
    backgroundColor: '#007AFF', // couleur bleue iOS
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 10,
    minWidth: 100, // assure une largeur minimale
    alignItems: 'center',
  },
  
  cancelButton: {
    backgroundColor: '#F2F2F7', // gris clair iOS
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 10,
    minWidth: 100, // assure une largeur minimale
    alignItems: 'center',
  },
  
  allowButtonText: {
    color: 'white',
    fontSize: 13,
    fontWeight: '600',
  },
  
  cancelButtonText: {
    color: '#007AFF',
    fontSize: 13,
    fontWeight: '600',
  },


});



export default styles;