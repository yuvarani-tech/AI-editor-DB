<?php
require_once 'db_connect.php';
header('Content-Type: application/json');

try {
    $stmt = $conn->prepare("SELECT * FROM settings WHERE id = 1");
    $stmt->execute();
    
    $settings = $stmt->fetch();
    
    if ($settings) {
        echo json_encode(['status' => 'success', 'settings' => $settings]);
    } else {
        echo json_encode(['status' => 'error', 'message' => 'Settings not found']);
    }
} catch(PDOException $e) {
    echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
}
?>
