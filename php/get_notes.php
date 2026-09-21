<?php
require_once 'db_connect.php';
header('Content-Type: application/json');

try {
    $stmt = $conn->prepare("SELECT * FROM notes ORDER BY created_at DESC");
    $stmt->execute();
    
    $notes = $stmt->fetchAll();
    
    echo json_encode(['status' => 'success', 'notes' => $notes]);
} catch(PDOException $e) {
    echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
}
?>
