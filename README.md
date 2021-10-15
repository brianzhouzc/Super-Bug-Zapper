# Super Bug Zapper
#### A mini game created with WebGL, for the COSC 414 Computer Graphics course
![Screenshot](https://github.com/brianzhouzc/Super-Bug-Zapper/blob/main/screenshot.png)
|Features||
|-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|--------------------|
| The playing field starts as a circular disk centered at the origin.                                                                                                                             | :heavy_check_mark: |
| Bacteria grow on the circumference of the disk starting at an arbitrary spot on the circumference and growing out uniformly in each direction from that spot at a speed determined by the game. | :heavy_check_mark: |
| The player needs to eradicate the bacteria by placing the mouse over the bacteria and hitting a button.                                                                                         | :heavy_check_mark: |
| The effect of the poison administered is to immediately remove the poisoned bacteria.                                                                                                           | :heavy_check_mark: |
| The game can randomly generate up to a fixed number (say 10) of different bacteria (each with a different color).                                                                               | :heavy_check_mark: |
| The bacteria appear as a crust on the circumference of the disk.                                                                                                                                | :heavy_check_mark: |
| The game gains points through the delays in the user responding and by any specific bacteria reaching a threshold.                                                                              | :heavy_check_mark: |
| The player wins if all bacteria are poisoned before any two different bacteria reach the threshold mentioned above.                                                                             | :heavy_check_mark: |

|Bonus Features||
|-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|--------------------|
| When two bacteria cultures collide, the first one to appear on the circumference dominates and consumes the later generated bacteria.                                                           | :heavy_check_mark: |
| When a bacterial culture is hit, use a simple 2D particle system to simulate an explosion at the point where the poison is administered.                                                        | :heavy_check_mark: |
