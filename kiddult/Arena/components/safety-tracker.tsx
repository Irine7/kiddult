"use client"

import { useState, useEffect, useRef } from "react"
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap } from "react-leaflet"
import L from "leaflet"
import * as turf from "@turf/turf"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { AlertCircle, MapPin, Plus, Trash2, AlertTriangle, User } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import "leaflet/dist/leaflet.css"
import { v4 as uuidv4 } from "uuid"
import { useToast } from "@/components/ui/use-toast"
import { ToastAction } from "@/components/ui/toast"

// Define types
interface SafeZone {
  id: string
  name: string
  lat: number
  lng: number
  radius: number
  color: string
}

interface LocationLog {
  timestamp: Date
  lat: number
  lng: number
  inSafeZone: boolean
  zoneName?: string
}

// Add this function at the top of your file, outside of the main component
function getLeafletIcon() {
  return L.icon({
    iconUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png",
    iconRetinaUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png",
    shadowUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png",
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41],
  })
}

// Update the LocationMarker component
function CenteredMarker({ position }: { position: [number, number] }) {
  const map = useMap()
  useEffect(() => {
    map.setView(position, map.getZoom(), { animate: true, duration: 1 })
  }, [map, position])

  return (
    <Marker position={position} icon={getLeafletIcon()}>
      <Popup>Current Location</Popup>
    </Marker>
  )
}

export default function SafetyTracker() {
  const [position, setPosition] = useState<[number, number]>([51.505, -0.09])
  const [safeZones, setSafeZones] = useState<SafeZone[]>([])
  const [newZone, setNewZone] = useState<Omit<SafeZone, "id">>({
    name: "",
    lat: 0,
    lng: 0,
    radius: 100,
    color: "#3b82f6",
  })
  const [locationLogs, setLocationLogs] = useState<LocationLog[]>([])
  const [isInSafeZone, setIsInSafeZone] = useState<boolean>(false)
  const [currentZone, setCurrentZone] = useState<string | null>(null)
  const [notificationsEnabled, setNotificationsEnabled] = useState<boolean>(false)
  const [permissionStatus, setPermissionStatus] = useState<string>("")

  const mapRef = useRef<L.Map | null>(null)

  const [selectedPerson, setSelectedPerson] = useState("child")
  const [simulationActive, setSimulationActive] = useState(false)
  const simulationIntervalRef = useRef<NodeJS.Timeout | null>(null)

  const [trackedPersons, setTrackedPersons] = useState<
    {
      id: string
      name: string
      position: [number, number]
      isActive: boolean
    }[]
  >([
    { id: "1", name: "Child", position: [51.505, -0.09], isActive: true },
    { id: "2", name: "Grandparent", position: [51.515, -0.08], isActive: false },
    { id: "3", name: "Teen", position: [51.525, -0.07], isActive: false },
  ])

  const { toast } = useToast()

  // Load safe zones from local storage
  useEffect(() => {
    const savedZones = localStorage.getItem("safeZones")
    if (savedZones) {
      setSafeZones(JSON.parse(savedZones))
    }
  }, [])

  // Save safe zones to local storage when they change
  useEffect(() => {
    localStorage.setItem("safeZones", JSON.stringify(safeZones))
  }, [safeZones])

  // Define paths for different scenarios
  const paths = {
    child: [
      [51.505, -0.09],
      [51.506, -0.091],
      [51.507, -0.092],
      [51.508, -0.093],
      [51.509, -0.094],
      [51.51, -0.095],
      [51.509, -0.094],
      [51.508, -0.093],
      [51.507, -0.092],
      [51.506, -0.091],
      [51.505, -0.09],
    ],
    elderly: [
      [51.515, -0.08],
      [51.516, -0.081],
      [51.517, -0.082],
      [51.518, -0.083],
      [51.519, -0.084],
      [51.52, -0.085],
      [51.519, -0.084],
      [51.518, -0.083],
      [51.517, -0.082],
      [51.516, -0.081],
      [51.515, -0.08],
    ],
    multiple: [
      [51.525, -0.07],
      [51.526, -0.071],
      [51.527, -0.072],
      [51.528, -0.073],
      [51.527, -0.073],
      [51.528, -0.074],
      [51.529, -0.075],
      [51.528, -0.074],
      [51.527, -0.073],
      [51.526, -0.072],
      [51.525, -0.07],
    ],
  }

  // Modify the useEffect that checks if the current position is in any safe zone
  useEffect(() => {
    if (safeZones.length > 0) {
      const point = turf.point([position[1], position[0]])
      let insideAnyZone = false
      let zoneName = null

      for (const zone of safeZones) {
        const circle = turf.circle([zone.lng, zone.lat], zone.radius / 1000, { units: "kilometers" })
        if (turf.booleanPointInPolygon(point, circle)) {
          insideAnyZone = true
          zoneName = zone.name
          break
        }
      }

      // Log the location
      const newLog: LocationLog = {
        timestamp: new Date(),
        lat: position[0],
        lng: position[1],
        inSafeZone: insideAnyZone,
        zoneName: zoneName || undefined,
      }

      setLocationLogs((prev) => [newLog, ...prev].slice(0, 100))

      // Check if we need to send a notification
      if (isInSafeZone && !insideAnyZone) {
        // Left a safe zone
        if (notificationsEnabled) {
          sendNotification("Safety Alert", "The person has left the safe zone!")
        }
        // Show toast notification
        toast({
          variant: "destructive",
          title: "Safety Alert",
          description: "The person has left the safe zone!",
          action: <ToastAction altText="View Map">View Map</ToastAction>,
        })
      }

      setIsInSafeZone(insideAnyZone)
      setCurrentZone(zoneName)
    }
  }, [position, safeZones, isInSafeZone, notificationsEnabled, toast])

  // Request notification permission
  const requestNotificationPermission = async () => {
    if (!("Notification" in window)) {
      setPermissionStatus("Notifications not supported in this browser")
      return
    }

    const permission = await Notification.requestPermission()
    setPermissionStatus(`Permission: ${permission}`)

    if (permission === "granted") {
      setNotificationsEnabled(true)
    }
  }

  // Send notification
  const sendNotification = (title: string, body: string) => {
    if (Notification.permission === "granted") {
      new Notification(title, {
        body,
        icon: "/favicon.ico",
      })
    }
  }

  // Add new safe zone
  const addSafeZone = () => {
    if (!newZone.name) return

    const zone: SafeZone = {
      id: uuidv4(),
      ...newZone,
    }

    setSafeZones([...safeZones, zone])
    setNewZone({
      name: "",
      lat: position[0],
      lng: position[1],
      radius: 100,
      color: getRandomColor(),
    })

    toast({
      title: "Safe zone added!",
      description: "Your safe zone has been successfully added.",
    })
  }

  // Delete safe zone
  const deleteSafeZone = (id: string) => {
    setSafeZones(safeZones.filter((zone) => zone.id !== id))
    toast({
      title: "Safe zone deleted!",
      description: "The safe zone has been successfully deleted.",
    })
  }

  // Use current location for new zone
  const useCurrentLocation = () => {
    setNewZone({
      ...newZone,
      lat: position[0],
      lng: position[1],
    })
  }

  // Generate random color for zones
  const getRandomColor = () => {
    const colors = ["#3b82f6", "#ef4444", "#10b981", "#f59e0b", "#8b5cf6", "#ec4899"]
    return colors[Math.floor(Math.random() * colors.length)]
  }

  // Add this function before the return statement
  const startSimulation = () => {
    if (simulationActive) {
      if (simulationIntervalRef.current) {
        clearInterval(simulationIntervalRef.current)
      }
      setSimulationActive(false)
      return
    }

    setSimulationActive(true)

    let pathIndex = 0
    const currentPath = paths[selectedPerson as keyof typeof paths]

    if (!currentPath) {
      console.error(`No path found for ${selectedPerson}`)
      return
    }

    // Set initial position
    setPosition(currentPath[0])

    // Simulate movement along the path
    simulationIntervalRef.current = setInterval(() => {
      pathIndex = (pathIndex + 1) % currentPath.length
      const newPosition = currentPath[pathIndex]
      setPosition(newPosition)

      if (mapRef.current) {
        mapRef.current.setView(newPosition, mapRef.current.getZoom(), { animate: true, duration: 1 })
      }
    }, 3000) // Move every 3 seconds
  }

  // Add this useEffect to clean up the interval
  useEffect(() => {
    return () => {
      if (simulationIntervalRef.current) {
        clearInterval(simulationIntervalRef.current)
      }
    }
  }, [])

  // Add this function to set up predefined scenarios
  const setupScenario = (scenario: string) => {
    setSelectedPerson(scenario)

    // Clear any existing simulation
    if (simulationIntervalRef.current) {
      clearInterval(simulationIntervalRef.current)
      setSimulationActive(false)
    }

    // Set up initial safe zones based on scenario
    let initialZones: SafeZone[] = []

    switch (scenario) {
      case "child":
        initialZones = [
          {
            id: uuidv4(),
            name: "Park",
            lat: 51.505,
            lng: -0.09,
            radius: 300,
            color: "#10b981",
          },
        ]
        setPosition([51.505, -0.09])
        break
      case "elderly":
        initialZones = [
          {
            id: uuidv4(),
            name: "Apartment",
            lat: 51.515,
            lng: -0.08,
            radius: 200,
            color: "#8b5cf6",
          },
        ]
        setPosition([51.515, -0.08])
        break
      case "multiple":
        initialZones = [
          {
            id: uuidv4(),
            name: "Home",
            lat: 51.525,
            lng: -0.07,
            radius: 250,
            color: "#ef4444",
          },
          {
            id: uuidv4(),
            name: "School",
            lat: 51.527,
            lng: -0.073,
            radius: 300,
            color: "#f59e0b",
          },
        ]
        setPosition([51.525, -0.07])
        break
    }

    setSafeZones(initialZones)
  }

  return (
    <div className="w-full max-w-6xl mx-auto">
      <Tabs defaultValue="map" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="map">Map</TabsTrigger>
          <TabsTrigger value="zones">Safe Zones</TabsTrigger>
          <TabsTrigger value="logs">Activity Logs</TabsTrigger>
          <TabsTrigger value="scenarios">Scenarios</TabsTrigger>
        </TabsList>

        <TabsContent value="map" className="space-y-4">
          <Card className="mb-4">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Simulation Controls</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col space-y-4">
                <div className="grid grid-cols-3 gap-2">
                  <Button
                    variant={selectedPerson === "child" ? "default" : "outline"}
                    onClick={() => setupScenario("child")}
                  >
                    Child in Park
                  </Button>
                  <Button
                    variant={selectedPerson === "elderly" ? "default" : "outline"}
                    onClick={() => setupScenario("elderly")}
                  >
                    Elderly Person
                  </Button>
                  <Button
                    variant={selectedPerson === "multiple" ? "default" : "outline"}
                    onClick={() => setupScenario("multiple")}
                  >
                    Multiple Zones
                  </Button>
                </div>
                <Button variant={simulationActive ? "destructive" : "default"} onClick={startSimulation}>
                  {simulationActive ? "Stop Simulation" : "Start Simulation"}
                </Button>
                <p className="text-xs text-muted-foreground">
                  Note: You can also drag the marker on the map to simulate movement manually.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Add this status display above the map */}
          <Card className="mb-4">
            <CardContent className="py-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className={`w-3 h-3 rounded-full mr-2 ${isInSafeZone ? "bg-green-500" : "bg-red-500"}`}></div>
                  <span className="font-medium">{isInSafeZone ? "Inside Safe Zone" : "Outside Safe Zone"}</span>
                </div>
                {isInSafeZone && currentZone && (
                  <span className="text-sm text-muted-foreground">Current Zone: {currentZone}</span>
                )}
              </div>
            </CardContent>
          </Card>

          <div className="h-[60vh] relative rounded-md overflow-hidden border">
            <MapContainer
              center={position}
              zoom={14}
              style={{ height: "100%", width: "100%" }}
              ref={mapRef}
              whenCreated={(map) => {
                mapRef.current = map
              }}
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              <CenteredMarker position={position} />
              {safeZones.map((zone) => (
                <Circle
                  key={zone.id}
                  center={[zone.lat, zone.lng]}
                  radius={zone.radius}
                  pathOptions={{ color: zone.color, fillColor: zone.color, fillOpacity: 0.2 }}
                >
                  <Popup>{zone.name}</Popup>
                </Circle>
              ))}
              {trackedPersons.map((person) => (
                <Marker key={person.id} position={person.position} icon={getLeafletIcon()}>
                  <Popup>{person.name}</Popup>
                </Marker>
              ))}
            </MapContainer>
          </div>

          <Card className="mt-4">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Tracked Persons</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-2">
                {trackedPersons.map((person) => (
                  <div
                    key={person.id}
                    className={`flex items-center justify-between p-3 border rounded-md ${
                      person.isActive ? "bg-primary/10" : ""
                    }`}
                  >
                    <div className="flex items-center">
                      <User className="h-5 w-5 mr-2" />
                      <div>
                        <p className="font-medium">{person.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {person.position[0].toFixed(6)}, {person.position[1].toFixed(6)}
                        </p>
                      </div>
                    </div>
                    <Button
                      variant={person.isActive ? "default" : "outline"}
                      size="sm"
                      onClick={() => {
                        const updatedPersons = trackedPersons.map((p) => ({
                          ...p,
                          isActive: p.id === person.id ? !p.isActive : p.isActive,
                        }))
                        setTrackedPersons(updatedPersons)

                        if (!person.isActive) {
                          setPosition(person.position)
                          setSelectedPerson(person.name.toLowerCase())
                        }
                      }}
                    >
                      {person.isActive ? "Active" : "Track"}
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <div className="flex flex-col space-y-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">Current Status</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">
                      Current location: {position[0].toFixed(6)}, {position[1].toFixed(6)}
                    </p>
                    <div className="flex items-center mt-2">
                      <Badge variant={isInSafeZone ? "success" : "destructive"} className="mr-2">
                        {isInSafeZone ? "In Safe Zone" : "Outside Safe Zones"}
                      </Badge>
                      {isInSafeZone && currentZone && <span className="text-sm">{currentZone}</span>}
                    </div>
                  </div>
                  <div>
                    <Button
                      variant={notificationsEnabled ? "outline" : "default"}
                      onClick={requestNotificationPermission}
                      disabled={notificationsEnabled}
                    >
                      {notificationsEnabled ? "Notifications On" : "Enable Notifications"}
                    </Button>
                    {permissionStatus && <p className="text-xs text-muted-foreground mt-1">{permissionStatus}</p>}
                  </div>
                </div>
              </CardContent>
            </Card>

            {!isInSafeZone && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Warning</AlertTitle>
                <AlertDescription>The person is currently outside all safe zones.</AlertDescription>
              </Alert>
            )}
          </div>
        </TabsContent>

        <TabsContent value="zones" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Add New Safe Zone</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="zone-name">Zone Name</Label>
                  <Input
                    id="zone-name"
                    value={newZone.name}
                    onChange={(e) => setNewZone({ ...newZone, name: e.target.value })}
                    placeholder="Home, School, etc."
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="zone-lat">Latitude</Label>
                    <Input
                      id="zone-lat"
                      type="number"
                      step="0.000001"
                      value={newZone.lat || ""}
                      onChange={(e) => setNewZone({ ...newZone, lat: Number.parseFloat(e.target.value) })}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="zone-lng">Longitude</Label>
                    <Input
                      id="zone-lng"
                      type="number"
                      step="0.000001"
                      value={newZone.lng || ""}
                      onChange={(e) => setNewZone({ ...newZone, lng: Number.parseFloat(e.target.value) })}
                    />
                  </div>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="zone-radius">Radius (meters)</Label>
                  <Input
                    id="zone-radius"
                    type="number"
                    min="50"
                    max="5000"
                    value={newZone.radius}
                    onChange={(e) => setNewZone({ ...newZone, radius: Number.parseInt(e.target.value) })}
                  />
                </div>

                <div className="flex space-x-2">
                  <Button onClick={useCurrentLocation} variant="outline" className="flex items-center">
                    <MapPin className="mr-2 h-4 w-4" />
                    Use Current Location
                  </Button>
                  <Button onClick={addSafeZone} className="flex items-center">
                    <Plus className="mr-2 h-4 w-4" />
                    Add Safe Zone
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Manage Safe Zones</CardTitle>
            </CardHeader>
            <CardContent>
              {safeZones.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">No safe zones added yet</p>
              ) : (
                <ScrollArea className="h-[300px]">
                  <div className="space-y-2">
                    {safeZones.map((zone) => (
                      <div
                        key={zone.id}
                        className="flex items-center justify-between p-3 border rounded-md"
                        style={{ borderLeftColor: zone.color, borderLeftWidth: "4px" }}
                      >
                        <div>
                          <h3 className="font-medium">{zone.name}</h3>
                          <p className="text-sm text-muted-foreground">
                            Radius: {zone.radius}m | Location: {zone.lat.toFixed(6)}, {zone.lng.toFixed(6)}
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => deleteSafeZone(zone.id)}
                          aria-label={`Delete ${zone.name}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="logs">
          <Card>
            <CardHeader>
              <CardTitle>Activity Logs</CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[500px]">
                {locationLogs.length === 0 ? (
                  <p className="text-muted-foreground text-center py-4">No activity logs yet</p>
                ) : (
                  <div className="space-y-2">
                    {locationLogs.map((log, index) => (
                      <div
                        key={index}
                        className="p-3 border rounded-md"
                        style={{
                          borderLeftColor: log.inSafeZone ? "#10b981" : "#ef4444",
                          borderLeftWidth: "4px",
                        }}
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <Badge variant={log.inSafeZone ? "success" : "destructive"}>
                              {log.inSafeZone ? `In Safe Zone: ${log.zoneName}` : "Outside Safe Zones"}
                            </Badge>
                            <p className="text-sm text-muted-foreground mt-1">
                              Location: {log.lat.toFixed(6)}, {log.lng.toFixed(6)}
                            </p>
                          </div>
                          <span className="text-xs text-muted-foreground">{log.timestamp.toLocaleTimeString()}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="scenarios">
          <Card>
            <CardHeader>
              <CardTitle>Use Case Scenarios</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="space-y-2">
                  <h3 className="text-lg font-medium">Scenario 1: Child in the Park</h3>
                  <p className="text-muted-foreground">
                    A mother finds her child in the park. The child leaves the zone, and the app immediately sends her a
                    push notification.
                  </p>
                  <Button
                    onClick={() => {
                      setupScenario("child")
                      setSelectedPerson("child")
                    }}
                    className="mt-2"
                  >
                    Set Up Scenario
                  </Button>
                </div>

                <div className="space-y-2">
                  <h3 className="text-lg font-medium">Scenario 2: Elderly Person with Dementia</h3>
                  <p className="text-muted-foreground">
                    An elderly person with dementia leaves their apartment and ends up outside the safe zone. The app
                    notifies the tutor of the exit, and they act quickly.
                  </p>
                  <Button
                    onClick={() => {
                      setupScenario("elderly")
                      setSelectedPerson("elderly")
                    }}
                    className="mt-2"
                  >
                    Set Up Scenario
                  </Button>
                </div>

                <div className="space-y-2">
                  <h3 className="text-lg font-medium">Scenario 3: Social Worker Monitoring</h3>
                  <p className="text-muted-foreground">
                    A social worker monitors multiple people under care. The app sends notifications when any of them
                    leave their safe zone.
                  </p>
                  <Button
                    onClick={() => {
                      setupScenario("multiple")
                      setSelectedPerson("multiple")
                    }}
                    className="mt-2"
                  >
                    Set Up Scenario
                  </Button>
                </div>

                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>How to Test</AlertTitle>
                  <AlertDescription>
                    1. Set up a scenario
                    <br />
                    2. Go to the Map tab
                    <br />
                    3. Click "Start Simulation" to see movement
                    <br />
                    4. Enable notifications to receive alerts when leaving safe zones
                    <br />
                    5. Or manually drag the marker outside the safe zone
                  </AlertDescription>
                </Alert>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

