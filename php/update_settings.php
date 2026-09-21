<?php
require_once 'db_connect.php';
header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $data = json_decode(file_get_contents('php://input'), true);
    
    $theme = $data['theme'] ?? 'dark';
    $font_family = $data['font_family'] ?? "'Inter', sans-serif";
    $font_size = $data['font_size'] ?? 16;
    $language = $data['language'] ?? 'en-US';
    $voice_speed = $data['voice_speed'] ?? 1.0;
    $bg_color = $data['bg_color'] ?? '#0f172a';
    
    try {
        // We update row 1 assuming a single user scenario for simplicity as per requirements
        $stmt = $conn->prepare("UPDATE settings SET 
            theme = :theme, 
            font_family = :font_family, 
            font_size = :font_size, 
            language = :language, 
            voice_speed = :voice_speed,
            bg_color = :bg_color
            WHERE id = 1");
            
        $stmt->bindParam(':theme', $theme);
        $stmt->bindParam(':font_family', $font_family);
        $stmt->bindParam(':font_size', $font_size);
        $stmt->bindParam(':language', $language);
        $stmt->bindParam(':voice_speed', $voice_speed);
        $stmt->bindParam(':bg_color', $bg_color);
        
        if ($stmt->execute()) {
            echo json_encode(['status' => 'success', 'message' => 'Settings updated successfully']);
        } else {
            echo json_encode(['status' => 'error', 'message' => 'Failed to update settings']);
        }
    } catch(PDOException $e) {
        echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
    }
} else {
    echo json_encode(['status' => 'error', 'message' => 'Invalid request method']);
}
?>
