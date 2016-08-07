<?php

?>
<div class="container">
    <div class="panel panel-default">
        <div class="panel-heading"><?= $user->displayName ?></div>

        <div class="panel-body">
            <?php foreach ($messages as $msg) {
                include '_message.php';
            } ?>
        </div
    </div
</div
